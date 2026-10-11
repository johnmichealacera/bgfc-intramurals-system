import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().optional(),
  scheduledAt: z.string().min(1),
  venue: z.string().optional(),
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
        { error: "Schedules are only for placement events. Use matches for team-vs-team events." },
        { status: 400 },
      );
    }

    const body = createSchema.parse(await req.json());
    const schedule = await db.eventSchedule.create({
      data: {
        sportEventId: id,
        title: body.title?.trim() || null,
        scheduledAt: new Date(body.scheduledAt),
        venue: body.venue?.trim() || null,
      },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
