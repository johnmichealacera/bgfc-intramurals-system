import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { sessionVsLabel } from "@/lib/format";
import type { AppRole } from "@/lib/auth";

export const tabulatorUserSelect = { id: true, name: true, email: true } as const;

export class TabulatorConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TabulatorConflictError";
  }
}

const ACTIVE = ["SCHEDULED", "LIVE"] as const;

export async function findTabulatorConflict(opts: {
  userId: string;
  scheduledAt: Date;
  excludeMatchId?: string;
  excludeScheduleId?: string;
}) {
  const [match, session] = await Promise.all([
    db.match.findFirst({
      where: {
        tabulatorUserId: opts.userId,
        scheduledAt: opts.scheduledAt,
        status: { in: [...ACTIVE] },
        ...(opts.excludeMatchId ? { id: { not: opts.excludeMatchId } } : {}),
      },
      include: { homeTeam: true, awayTeam: true, sportEvent: true },
    }),
    db.eventSchedule.findFirst({
      where: {
        tabulatorUserId: opts.userId,
        scheduledAt: opts.scheduledAt,
        status: { in: [...ACTIVE] },
        ...(opts.excludeScheduleId ? { id: { not: opts.excludeScheduleId } } : {}),
      },
      include: { sportEvent: true, scores: { include: { team: true }, orderBy: { createdAt: "asc" as const } } },
    }),
  ]);
  return match ?? session ?? null;
}

export function tabulatorConflictMessage(conflict: NonNullable<Awaited<ReturnType<typeof findTabulatorConflict>>>) {
  const eventName = conflict.sportEvent?.name ?? "another event";
  if ("homeTeam" in conflict) {
    return `${conflict.homeTeam.name} vs ${conflict.awayTeam.name} (${eventName}) is already assigned to this tabulator at the same time.`;
  }
  return `${sessionVsLabel(conflict.scores, conflict.title || "Solo session")} (${eventName}) is already assigned to this tabulator at the same time.`;
}

export async function assertNoTabulatorConflict(opts: {
  userId: string;
  scheduledAt: Date;
  status: string;
  excludeMatchId?: string;
  excludeScheduleId?: string;
}) {
  if (opts.status !== "SCHEDULED" && opts.status !== "LIVE") return;
  const conflict = await findTabulatorConflict(opts);
  if (conflict) throw new TabulatorConflictError(tabulatorConflictMessage(conflict));
}

export async function assertMatchAccess(session: Session | null, matchId: string) {
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId) throw new Error("Forbidden");
  if (role === "ADMIN") return;
  if (role !== "TABULATOR") throw new Error("Forbidden");

  const match = await db.match.findUnique({ where: { id: matchId }, select: { tabulatorUserId: true } });
  if (!match || match.tabulatorUserId !== userId) throw new Error("Forbidden");
}

export async function assertScheduleAccess(session: Session | null, scheduleId: string) {
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId) throw new Error("Forbidden");
  if (role === "ADMIN") return;
  if (role !== "TABULATOR") throw new Error("Forbidden");

  const schedule = await db.eventSchedule.findUnique({
    where: { id: scheduleId },
    select: { tabulatorUserId: true },
  });
  if (!schedule || schedule.tabulatorUserId !== userId) throw new Error("Forbidden");
}
