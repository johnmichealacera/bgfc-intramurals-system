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

    const totals = await db.eventPlacement.groupBy({
      by: ["teamId"],
      where: { sportEvent: { seasonId } },
      _sum: { points: true },
    });
    if (totals.length === 0) return NextResponse.json([]);

    const pointsByTeam = new Map(totals.map((t) => [t.teamId, t._sum.points ?? 0]));
    const teams = await db.team.findMany({ where: { id: { in: totals.map((t) => t.teamId) } } });

    const standings = teams
      .map((team) => ({ team, totalPoints: pointsByTeam.get(team.id) ?? 0 }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.team.name.localeCompare(b.team.name));

    return NextResponse.json(standings);
  } catch (error) {
    return apiError(error);
  }
}
