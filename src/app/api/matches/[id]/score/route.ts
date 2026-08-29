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

/**
 * Atomic increment/decrement — never read-then-write. A negative delta uses a
 * conditional updateMany so a race can't drive the score below zero; zero rows
 * affected there is treated as a floor no-op, not an error.
 */
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
    const { team, delta } = scoreSchema.parse(await req.json());

    const match = await db.match.findUniqueOrThrow({ where: { id } });
    await assertEventAccess(session, match.sportEventId);

    const result = await applyDelta(id, team, delta, session!.user.id);

    if (result.count === 0) {
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      if (fresh.status !== "LIVE") {
        return NextResponse.json({ error: "Match is not live." }, { status: 409 });
      }
      // Decrement floor reached — idempotent no-op, return current state.
      return NextResponse.json(fresh);
    }

    const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
    return NextResponse.json(fresh);
  } catch (error) {
    return apiError(error);
  }
}
