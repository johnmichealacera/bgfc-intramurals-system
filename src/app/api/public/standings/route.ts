import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    let seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) {
      const activeSeason = await db.season.findFirst({ where: { isActive: true } });
      if (!activeSeason) return NextResponse.json([]);
      seasonId = activeSeason.id;
    }

    const teams = await db.team.findMany({ where: { seasonId } });
    const totals = await db.eventPlacement.groupBy({
      by: ["teamId"],
      where: { sportEvent: { seasonId } },
      _sum: { points: true },
    });
    const pointsByTeam = new Map(totals.map((t) => [t.teamId, t._sum.points ?? 0]));

    const medalTotals = await db.eventPlacement.groupBy({
      by: ["teamId", "placement"],
      where: { sportEvent: { seasonId }, placement: { in: [1, 2, 3] } },
      _count: { _all: true },
    });
    const medalsByTeam = new Map<string, { gold: number; silver: number; bronze: number }>();
    for (const row of medalTotals) {
      const current = medalsByTeam.get(row.teamId) ?? { gold: 0, silver: 0, bronze: 0 };
      if (row.placement === 1) current.gold = row._count._all;
      else if (row.placement === 2) current.silver = row._count._all;
      else current.bronze = row._count._all;
      medalsByTeam.set(row.teamId, current);
    }

    const finalizedEvents = await db.eventPlacement.findMany({
      where: { sportEvent: { seasonId } },
      distinct: ["sportEventId"],
      select: { sportEventId: true },
    });
    const finalizedEventIds = finalizedEvents.map((row) => row.sportEventId);

    const finishedMatches = await db.match.findMany({
      where: {
        status: "FINISHED",
        sportEvent: { seasonId, ...(finalizedEventIds.length ? { id: { notIn: finalizedEventIds } } : {}) },
      },
      select: { winnerTeamId: true, homeTeamId: true, awayTeamId: true },
    });

    const WIN_POINTS = 2;
    const DRAW_POINTS = 1;
    for (const match of finishedMatches) {
      if (match.winnerTeamId) {
        pointsByTeam.set(match.winnerTeamId, (pointsByTeam.get(match.winnerTeamId) ?? 0) + WIN_POINTS);
      } else {
        pointsByTeam.set(match.homeTeamId, (pointsByTeam.get(match.homeTeamId) ?? 0) + DRAW_POINTS);
        pointsByTeam.set(match.awayTeamId, (pointsByTeam.get(match.awayTeamId) ?? 0) + DRAW_POINTS);
      }
    }

    const finishedSessions = await db.eventSchedule.findMany({
      where: {
        status: "FINISHED",
        sportEvent: { seasonId, ...(finalizedEventIds.length ? { id: { notIn: finalizedEventIds } } : {}) },
      },
      include: { scores: true },
    });
    for (const session of finishedSessions) {
      if (!session.scores.length) continue;
      const top = Math.max(...session.scores.map((row) => row.score));
      for (const row of session.scores) {
        if (row.score === top) {
          pointsByTeam.set(row.teamId, (pointsByTeam.get(row.teamId) ?? 0) + WIN_POINTS);
        }
      }
    }

    const standings = teams
      .map((team) => ({
        team,
        totalPoints: pointsByTeam.get(team.id) ?? 0,
        ...(medalsByTeam.get(team.id) ?? { gold: 0, silver: 0, bronze: 0 }),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.team.name.localeCompare(b.team.name));

    return NextResponse.json(standings);
  } catch (error) {
    return apiError(error);
  }
}
