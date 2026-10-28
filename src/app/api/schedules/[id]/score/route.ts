import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertEventAccess } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { scheduleInclude } from "@/lib/session-scoreboard";

const scoreSchema = z
  .object({
    teamId: z.string().min(1),
    delta: z.number().int().min(-5).max(5),
  })
  .refine((data) => data.delta !== 0, { message: "delta must not be zero" });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const { teamId, delta } = scoreSchema.parse(await req.json());

    const schedule = await db.eventSchedule.findUniqueOrThrow({ where: { id } });
    await assertEventAccess(session, schedule.sportEventId);

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
        return NextResponse.json({ error: "Finished sessions are locked and cannot be scored." }, { status: 409 });
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
