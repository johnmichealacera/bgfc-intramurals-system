import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  scheduledAt: z.string().min(1).optional(),
  venue: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id, scheduleId } = await params;
    const body = updateSchema.parse(await req.json());

    const existing = await db.eventSchedule.findFirst({
      where: { id: scheduleId, sportEventId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const schedule = await db.eventSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(body.title !== undefined ? { title: body.title?.trim() || null } : {}),
        ...(body.scheduledAt !== undefined ? { scheduledAt: new Date(body.scheduledAt) } : {}),
        ...(body.venue !== undefined ? { venue: body.venue?.trim() || null } : {}),
      },
    });
    return NextResponse.json(schedule);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id, scheduleId } = await params;
    const existing = await db.eventSchedule.findFirst({
      where: { id: scheduleId, sportEventId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await db.eventSchedule.delete({ where: { id: scheduleId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
