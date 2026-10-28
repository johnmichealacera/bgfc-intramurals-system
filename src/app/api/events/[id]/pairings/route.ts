import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { buildRoundRobinPairings, pairKey } from "@/lib/bracket";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const event = await db.sportEvent.findUniqueOrThrow({
      where: { id },
      include: { eventTeams: true, matches: { where: { phase: "ROUND_ROBIN" }, select: { homeTeamId: true, awayTeamId: true } } },
    });
    if (event.type !== "TEAM_VS_TEAM") {
      return NextResponse.json(
        { error: "Round-robin pairings are for group events." },
        { status: 400 },
      );
    }

    const teamIds = event.eventTeams.map((entry) => entry.teamId);
    if (teamIds.length < 2) {
      return NextResponse.json({ error: "Enroll at least two teams before generating pairings." }, { status: 400 });
    }

    const existing = new Set(event.matches.map((match) => pairKey(match.homeTeamId, match.awayTeamId)));
    const missing = buildRoundRobinPairings(teamIds).filter(
      (pair) => !existing.has(pairKey(pair.homeTeamId, pair.awayTeamId)),
    );
    if (missing.length === 0) {
      return NextResponse.json({ error: "Every enrolled team already has a round-robin pairing." }, { status: 409 });
    }

    const now = Date.now();
    await db.match.createMany({
      data: missing.map((pair, index) => ({
        sportEventId: id,
        homeTeamId: pair.homeTeamId,
        awayTeamId: pair.awayTeamId,
        scheduledAt: new Date(now + index * 60_000),
        status: "SCHEDULED",
        phase: "ROUND_ROBIN",
      })),
    });

    const matches = await db.match.findMany({
      where: { sportEventId: id },
      include: { homeTeam: true, awayTeam: true, winnerTeam: true },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json({ created: missing.length, matches }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
