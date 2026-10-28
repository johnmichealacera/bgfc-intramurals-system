import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { scheduleInclude } from "@/lib/session-scoreboard";

export async function GET() {
  try {
    const activeSeason = await db.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) return NextResponse.json([]);

    const sessions = await db.eventSchedule.findMany({
      where: { status: "LIVE", sportEvent: { seasonId: activeSeason.id } },
      include: scheduleInclude,
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    return apiError(error);
  }
}
