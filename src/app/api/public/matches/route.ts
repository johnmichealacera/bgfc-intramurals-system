import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

    const matches = await db.match.findMany({
      where: { sportEventId: eventId },
      include: { homeTeam: true, awayTeam: true, winnerTeam: true },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(matches);
  } catch (error) {
    return apiError(error);
  }
}
