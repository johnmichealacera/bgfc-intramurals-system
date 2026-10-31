import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["TABULATOR"]);

    const userId = session!.user.id;
    const events = await db.sportEvent.findMany({
      where: {
        OR: [{ matches: { some: { tabulatorUserId: userId } } }, { schedules: { some: { tabulatorUserId: userId } } }],
      },
      include: {
        matches: {
          where: { tabulatorUserId: userId },
          include: {
            homeTeam: true,
            awayTeam: true,
            tabulator: { select: { id: true, name: true, email: true } },
            resumeRequestedBy: { select: { id: true, name: true } },
            resumeApprovedBy: { select: { id: true, name: true } },
            controlRequestedBy: { select: { id: true, name: true } },
            controlApprovedBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
        schedules: {
          where: { tabulatorUserId: userId },
          include: {
            scores: { include: { team: true }, orderBy: { createdAt: "asc" } },
            tabulator: { select: { id: true, name: true, email: true } },
            resumeRequestedBy: { select: { id: true, name: true } },
            resumeApprovedBy: { select: { id: true, name: true } },
            controlRequestedBy: { select: { id: true, name: true } },
            controlApprovedBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (error) {
    return apiError(error);
  }
}
