import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { assertScheduleAccess } from "@/lib/tabulator";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { scheduleInclude } from "@/lib/session-scoreboard";

const liveSchema = z
  .object({
    teamId: z.string().min(1),
    delta: z.number().int().min(-5).max(5),
  })
  .refine((data) => data.delta !== 0, { message: "delta must not be zero" });

const correctSchema = z.object({
  scores: z
    .array(z.object({ teamId: z.string().min(1), score: z.number().int().min(0).max(999) }))
    .min(1),
  reason: z.string().trim().min(8, "Write a reason (at least 8 characters)."),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const body = await req.json();
    const correction = correctSchema.safeParse(body);
    if (correction.success) {
      assertRole(session, ["ADMIN"]);
      const schedule = await db.eventSchedule.findUniqueOrThrow({
        where: { id },
        include: { scores: true },
      });
      if (schedule.status !== "FINISHED") {
        return NextResponse.json({ error: "Only finished sessions can have scores corrected." }, { status: 409 });
      }

      const known = new Set(schedule.scores.map((row) => row.teamId));
      if (correction.data.scores.some((row) => !known.has(row.teamId))) {
        return NextResponse.json({ error: "Every corrected team must already have a score row." }, { status: 400 });
      }

      await db.$transaction([
        ...correction.data.scores.map((row) =>
          db.eventScheduleScore.update({
            where: { scheduleId_teamId: { scheduleId: id, teamId: row.teamId } },
            data: { score: row.score },
          }),
        ),
        db.eventSchedule.update({
          where: { id },
          data: {
            updatedByUserId: session!.user.id,
            scoreCorrectedAt: new Date(),
            scoreCorrectedByUserId: session!.user.id,
            scoreCorrectionReason: correction.data.reason,
          },
        }),
      ]);
      const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
      return NextResponse.json(fresh);
    }

    const { teamId, delta } = liveSchema.parse(body);
    const schedule = await db.eventSchedule.findUniqueOrThrow({ where: { id } });
    await assertScheduleAccess(session, schedule.id);

    const result =
      delta > 0
        ? await db.eventScheduleScore.updateMany({
            where: { scheduleId: id, teamId, schedule: { status: "LIVE" } },
            data: { score: { increment: delta } },
          })
        : await db.eventScheduleScore.updateMany({
            where: { scheduleId: id, teamId, score: { gte: -delta }, schedule: { status: "LIVE" } },
            data: { score: { decrement: -delta } },
          });

    if (result.count === 0) {
      const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
      if (fresh.status === "FINISHED") {
        return NextResponse.json({ error: "Finished sessions are locked. An admin can correct them with a reason." }, { status: 409 });
      }
      if (fresh.status === "POSTPONED") {
        return NextResponse.json({ error: "Postponed sessions are locked until they are resumed." }, { status: 409 });
      }
      if (fresh.status !== "LIVE") {
        return NextResponse.json({ error: "Session is not live." }, { status: 409 });
      }
      return NextResponse.json(fresh);
    }

    await db.eventSchedule.update({ where: { id }, data: { updatedByUserId: session!.user.id } });
    const fresh = await db.eventSchedule.findUniqueOrThrow({ where: { id }, include: scheduleInclude });
    return NextResponse.json(fresh);
  } catch (error) {
    return apiError(error);
  }
}
