import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { assertMatchAccess } from "@/lib/tabulator";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { advanceBracketWinner } from "@/lib/bracket";

const liveSchema = z
  .object({
    team: z.enum(["HOME", "AWAY"]),
    delta: z.number().int().min(-5).max(5),
  })
  .refine((data) => data.delta !== 0, { message: "delta must not be zero" });

const correctSchema = z.object({
  homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999),
  reason: z.string().trim().min(8, "Write a reason (at least 8 characters)."),
});

const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  winnerTeam: true,
  sportEvent: true,
  scoreCorrectedBy: { select: { id: true, name: true } },
} as const;

async function applyDelta(id: string, team: "HOME" | "AWAY", delta: number, userId: string) {
  if (team === "HOME") {
    return delta > 0
      ? db.match.updateMany({
          where: { id, status: "LIVE" },
          data: { homeScore: { increment: delta }, updatedByUserId: userId },
        })
      : db.match.updateMany({
          where: { id, status: "LIVE", homeScore: { gte: -delta } },
          data: { homeScore: { decrement: -delta }, updatedByUserId: userId },
        });
  }
  return delta > 0
    ? db.match.updateMany({
        where: { id, status: "LIVE" },
        data: { awayScore: { increment: delta }, updatedByUserId: userId },
      })
    : db.match.updateMany({
        where: { id, status: "LIVE", awayScore: { gte: -delta } },
        data: { awayScore: { decrement: -delta }, updatedByUserId: userId },
      });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const body = await req.json();
    const correction = correctSchema.safeParse(body);
    if (correction.success) {
      assertRole(session, ["ADMIN"]);
      const match = await db.match.findUniqueOrThrow({ where: { id } });
      if (match.status !== "FINISHED") {
        return NextResponse.json({ error: "Only finished matches can have scores corrected." }, { status: 409 });
      }

      const winnerTeamId =
        correction.data.homeScore === correction.data.awayScore
          ? null
          : correction.data.homeScore > correction.data.awayScore
            ? match.homeTeamId
            : match.awayTeamId;

      const updated = await db.$transaction(async (tx) => {
        const row = await tx.match.update({
          where: { id },
          data: {
            homeScore: correction.data.homeScore,
            awayScore: correction.data.awayScore,
            winnerTeamId,
            updatedByUserId: session!.user.id,
            scoreCorrectedAt: new Date(),
            scoreCorrectedByUserId: session!.user.id,
            scoreCorrectionReason: correction.data.reason,
          },
          include: matchInclude,
        });
        await advanceBracketWinner(tx, id, winnerTeamId);
        return row;
      });
      return NextResponse.json(updated);
    }

    const { team, delta } = liveSchema.parse(body);
    const match = await db.match.findUniqueOrThrow({ where: { id } });
    await assertMatchAccess(session, match.id);

    const result = await applyDelta(id, team, delta, session!.user.id);

    if (result.count === 0) {
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      if (fresh.status === "FINISHED") {
        return NextResponse.json({ error: "Finished matches are locked. An admin can correct them with a reason." }, { status: 409 });
      }
      if (fresh.status === "POSTPONED") {
        return NextResponse.json({ error: "Postponed matches are locked until they are resumed." }, { status: 409 });
      }
      if (fresh.status !== "LIVE") {
        return NextResponse.json({ error: "Match is not live." }, { status: 409 });
      }
      return NextResponse.json(fresh);
    }

    const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
    return NextResponse.json(fresh);
  } catch (error) {
    return apiError(error);
  }
}
