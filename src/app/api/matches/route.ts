import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const matchSchema = z
  .object({
    sportEventId: z.string().min(1),
    homeTeamId: z.string().min(1),
    awayTeamId: z.string().min(1),
    scheduledAt: z.coerce.date(),
    venue: z.string().optional(),
  })
  .refine((data) => data.homeTeamId !== data.awayTeamId, {
    message: "Home and away teams must be different.",
    path: ["awayTeamId"],
  });

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");
    const seasonId = url.searchParams.get("seasonId");
    const role = session!.user.role;
    const userId = session!.user.id;

    const matches = await db.match.findMany({
      where: {
        ...(eventId ? { sportEventId: eventId } : {}),
        ...(seasonId ? { sportEvent: { seasonId } } : {}),
        ...(role === "TABULATOR" ? { tabulatorUserId: userId } : {}),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        winnerTeam: true,
        sportEvent: true,
        resumeRequestedBy: { select: { id: true, name: true } },
        resumeApprovedBy: { select: { id: true, name: true } },
        controlRequestedBy: { select: { id: true, name: true } },
        controlApprovedBy: { select: { id: true, name: true } },
        tabulator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(matches);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = matchSchema.parse(await req.json());

    const enrolled = await db.eventTeam.findMany({
      where: {
        sportEventId: body.sportEventId,
        teamId: { in: [body.homeTeamId, body.awayTeamId] },
      },
      select: { teamId: true },
    });
    const enrolledIds = new Set(enrolled.map((e) => e.teamId));
    if (!enrolledIds.has(body.homeTeamId) || !enrolledIds.has(body.awayTeamId)) {
      return NextResponse.json(
        { error: "Both teams must be enrolled in this event before scheduling a match." },
        { status: 400 },
      );
    }

    const match = await db.match.create({
      data: body,
      include: { homeTeam: true, awayTeam: true },
    });
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
