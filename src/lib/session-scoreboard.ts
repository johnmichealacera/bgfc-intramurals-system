import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const scheduleInclude = {
  sportEvent: true,
  scores: { include: { team: true }, orderBy: { team: { name: "asc" as const } } },
  resumeRequestedBy: { select: { id: true, name: true } },
  resumeApprovedBy: { select: { id: true, name: true } },
  controlRequestedBy: { select: { id: true, name: true } },
  controlApprovedBy: { select: { id: true, name: true } },
} satisfies Prisma.EventScheduleInclude;

export const clearResume = {
  resumeRequestedAt: null,
  resumeApprovedAt: null,
  resumeRequestedByUserId: null,
  resumeApprovedByUserId: null,
  resumeRequestReason: null,
};

export const clearControl = {
  controlRequestedAt: null,
  controlApprovedAt: null,
  controlRequestedByUserId: null,
  controlApprovedByUserId: null,
  controlRequestReason: null,
};

export async function ensureScheduleScores(scheduleId: string, sportEventId: string) {
  const teams = await db.eventTeam.findMany({
    where: { sportEventId },
    select: { teamId: true },
  });
  if (teams.length === 0) return;
  await db.eventScheduleScore.createMany({
    data: teams.map((team) => ({ scheduleId, teamId: team.teamId })),
    skipDuplicates: true,
  });
}
