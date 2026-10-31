import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { assertNoTabulatorConflict } from "@/lib/tabulator";

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
    if (existing.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only scheduled sessions can be edited." }, { status: 409 });
    }

    if (body.scheduledAt && existing.tabulatorUserId) {
      await assertNoTabulatorConflict({
        userId: existing.tabulatorUserId,
        scheduledAt: new Date(body.scheduledAt),
        status: existing.status,
        excludeScheduleId: scheduleId,
      });
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
    if (existing.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only scheduled sessions can be deleted." }, { status: 409 });
    }

    await db.eventSchedule.delete({ where: { id: scheduleId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
