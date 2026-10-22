import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertEventAccess } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const actionSchema = z.object({ action: z.enum(["START", "FINISH", "POSTPONE"]) });

const matchInclude = { homeTeam: true, awayTeam: true, winnerTeam: true, sportEvent: true } as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { action } = actionSchema.parse(await req.json());

    const match = await db.match.findUniqueOrThrow({ where: { id } });
    await assertEventAccess(session, match.sportEventId);
    const userId = session!.user.id;

    if (action === "START") {
      const result = await db.match.updateMany({
        where: { id, status: { in: ["SCHEDULED", "POSTPONED"] } },
        data: { status: "LIVE", updatedByUserId: userId },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Only scheduled or postponed matches can be started." }, { status: 409 });
      }
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      return NextResponse.json(fresh);
    }

    if (action === "POSTPONE") {
      const result = await db.match.updateMany({
        where: { id, status: { in: ["SCHEDULED", "LIVE"] } },
        data: { status: "POSTPONED", updatedByUserId: userId },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: "Only scheduled or live matches can be postponed." }, { status: 409 });
      }
      const fresh = await db.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      return NextResponse.json(fresh);
    }

    // FINISH — idempotent: re-finishing an already-FINISHED match is a no-op, never recomputes the winner.
    const finished = await db.$transaction(async (tx) => {
      const current = await tx.match.findUniqueOrThrow({ where: { id } });
      if (current.status !== "LIVE") {
        return tx.match.findUniqueOrThrow({ where: { id }, include: matchInclude });
      }

      const winnerTeamId =
        current.homeScore === current.awayScore
          ? null
          : current.homeScore > current.awayScore
            ? current.homeTeamId
            : current.awayTeamId;

      return tx.match.update({
        where: { id },
        data: { status: "FINISHED", winnerTeamId, updatedByUserId: userId },
        include: matchInclude,
      });
    });

    return NextResponse.json(finished);
  } catch (error) {
    return apiError(error);
  }
}
