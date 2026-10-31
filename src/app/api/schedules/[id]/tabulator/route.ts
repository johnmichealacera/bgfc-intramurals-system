import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { scheduleInclude } from "@/lib/session-scoreboard";
import { assertNoTabulatorConflict } from "@/lib/tabulator";

const schema = z.object({
  userId: z.string().min(1).nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const { userId } = schema.parse(await req.json());
    const schedule = await db.eventSchedule.findUniqueOrThrow({ where: { id } });

    if (userId) {
      const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.role !== "TABULATOR") {
        return NextResponse.json({ error: "Only tabulator accounts can be assigned to a game." }, { status: 400 });
      }
      await assertNoTabulatorConflict({
        userId,
        scheduledAt: schedule.scheduledAt,
        status: schedule.status,
        excludeScheduleId: id,
      });
    }

    const updated = await db.eventSchedule.update({
      where: { id },
      data: { tabulatorUserId: userId },
      include: scheduleInclude,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
