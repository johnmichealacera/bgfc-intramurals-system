import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const createSchema = z
  .object({
    title: z.string().optional(),
    scheduledAt: z.string().min(1),
    venue: z.string().optional(),
    homeTeamId: z.string().min(1),
    awayTeamId: z.string().min(1),
  })
  .refine((data) => data.homeTeamId !== data.awayTeamId, {
    message: "Home and away teams must be different.",
    path: ["awayTeamId"],
  });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id } = await params;
    const schedules = await db.eventSchedule.findMany({
      where: { sportEventId: id },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const event = await db.sportEvent.findUniqueOrThrow({ where: { id } });
    if (event.type !== "PLACEMENT") {
      return NextResponse.json(
        { error: "Schedules are only for solo events. Use matches for group events." },
        { status: 400 },
      );
    }

    const body = createSchema.parse(await req.json());
    const enrolled = await db.eventTeam.findMany({
      where: { sportEventId: id, teamId: { in: [body.homeTeamId, body.awayTeamId] } },
      select: { teamId: true },
    });
    const enrolledIds = new Set(enrolled.map((row) => row.teamId));
    if (!enrolledIds.has(body.homeTeamId) || !enrolledIds.has(body.awayTeamId)) {
      return NextResponse.json(
        { error: "Both teams must be enrolled in this event before scheduling a game." },
        { status: 400 },
      );
    }

    const schedule = await db.eventSchedule.create({
      data: {
        sportEventId: id,
        title: body.title?.trim() || null,
        scheduledAt: new Date(body.scheduledAt),
        venue: body.venue?.trim() || null,
        scores: {
          create: [{ teamId: body.homeTeamId }, { teamId: body.awayTeamId }],
        },
      },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
