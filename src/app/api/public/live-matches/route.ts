import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const activeSeason = await db.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) return NextResponse.json([]);

    const matches = await db.match.findMany({
      where: { status: "LIVE", sportEvent: { seasonId: activeSeason.id } },
      include: { homeTeam: true, awayTeam: true, sportEvent: true },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(matches);
  } catch (error) {
    return apiError(error);
  }
}
