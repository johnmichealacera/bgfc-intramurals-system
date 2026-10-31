import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { scheduleInclude } from "@/lib/session-scoreboard";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    const seasonId = url.searchParams.get("seasonId");
    const role = session!.user.role;
    const userId = session!.user.id;

    const schedules = await db.eventSchedule.findMany({
      where: {
        ...(eventId ? { sportEventId: eventId } : {}),
        ...(seasonId ? { sportEvent: { seasonId } } : {}),
        ...(role === "TABULATOR" ? { tabulatorUserId: userId } : {}),
      },
      include: scheduleInclude,
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    return apiError(error);
  }
}
