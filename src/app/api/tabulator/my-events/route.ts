import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["TABULATOR"]);

    const events = await db.sportEvent.findMany({
      where: { tabulators: { some: { userId: session!.user.id } } },
      include: {
        matches: { include: { homeTeam: true, awayTeam: true }, orderBy: { scheduledAt: "asc" } },
        schedules: { orderBy: { scheduledAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (error) {
    return apiError(error);
  }
}
