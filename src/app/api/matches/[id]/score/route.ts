import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertEventAccess } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const scoreSchema = z
  .object({
    team: z.enum(["HOME", "AWAY"]),
    delta: z.number().int().min(-5).max(5),
  })
  .refine((data) => data.delta !== 0, { message: "delta must not be zero" });

const matchInclude = { homeTeam: true, awayTeam: true, winnerTeam: true, sportEvent: true } as const;
const scoreableStatuses = ["LIVE", "FINISHED"] as const;

/**
 * Atomic increment/decrement — never read-then-write. A negative delta uses a
 * conditional updateMany so a race can't drive the score below zero; zero rows
 * affected there is treated as a floor no-op, not an error.
 */
async function applyDelta(id: string, team: "HOME" | "AWAY", delta: number, userId: string) {
  const status = { in: [...scoreableStatuses] };
  if (team === "HOME") {
    return delta > 0
      ? db.match.updateMany({
          where: { id, status },
          data: { homeScore: { increment: delta }, updatedByUserId: userId },
        })
      : db.match.updateMany({
          where: { id, status, homeScore: { gte: -delta } },
          data: { homeScore: { decrement: -delta }, updatedByUserId: userId },
        });
  }
  return delta > 0
    ? db.match.updateMany({
        where: { id, status },
        data: { awayScore: { increment: delta }, updatedByUserId: userId },
      })
    : db.match.updateMany({
        where: { id, status, awayScore: { gte: -delta } },
        data: { awayScore: { decrement: -delta }, updatedByUserId: userId },
      });
}

function winnerFromScores(homeScore: number, awayScore: number, homeTeamId: string, awayTeamId: string) {
  if (homeScore === awayScore) return null;
  return homeScore > awayScore ? homeTeamId : awayTeamId;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { team, delta } = scoreSchema.parse(await req.json());

    const match = await db.match.findUniqueOrThrow({ where: { id } });
    await assertEventAccess(session, match.sportEventId);

    const result = await applyDelta(id, team, delta, session!.user.id);

    if (result.count === 0) {
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      if (!scoreableStatuses.includes(fresh.status as (typeof scoreableStatuses)[number])) {
        return NextResponse.json(
          { error: "Scores can only be updated while the match is live or finished." },
          { status: 409 },
        );
      }
      return NextResponse.json(fresh);
    }

    let fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });

    if (fresh.status === "FINISHED") {
      const winnerTeamId = winnerFromScores(
        fresh.homeScore,
        fresh.awayScore,
        fresh.homeTeamId,
        fresh.awayTeamId,
      );
      if (fresh.winnerTeamId !== winnerTeamId) {
        fresh = await db.match.update({
          where: { id },
          data: { winnerTeamId },
          include: matchInclude,
        });
      }
    }

    return NextResponse.json(fresh);
  } catch (error) {
    return apiError(error);
  }
}
