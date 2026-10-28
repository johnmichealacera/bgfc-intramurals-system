"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Radio, Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { format, sessionSides, sessionVsLabel } from "@/lib/format";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { EventSchedule, Match, SportEvent } from "@/lib/types";

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

type ScoreboardItem =
  | { kind: "match"; id: string; status: Match["status"]; scheduledAt: string; href: string; match: Match }
  | { kind: "session"; id: string; status: EventSchedule["status"]; scheduledAt: string; href: string; session: EventSchedule };

export default function ScoreboardListPage() {
  const { data: session, status } = useSession();
  const role = session?.user.role;
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();

  const { data: tabulatorEvents, isLoading: loadingTabulator } = useQuery({
    queryKey: ["tabulator", "my-events"],
    queryFn: () => apiFetch<(SportEvent & { matches: Match[]; schedules: EventSchedule[] })[]>("/api/tabulator/my-events"),
    enabled: role === "TABULATOR",
  });

  const { data: adminMatches, isLoading: loadingAdminMatches } = useQuery({
    queryKey: ["matches", "season", seasonId],
    queryFn: () => apiFetch<Match[]>(`/api/matches?seasonId=${seasonId}`),
    enabled: role === "ADMIN" && !!seasonId,
  });

  const { data: adminSessions, isLoading: loadingAdminSessions } = useQuery({
    queryKey: ["schedules", "season", seasonId],
    queryFn: () => apiFetch<EventSchedule[]>(`/api/schedules?seasonId=${seasonId}`),
    enabled: role === "ADMIN" && !!seasonId,
  });

  const isLoading =
    status === "loading" ||
    !role ||
    !seasonId ||
    (role === "TABULATOR" ? loadingTabulator : loadingAdminMatches || loadingAdminSessions);
  const seasonEvents = (tabulatorEvents ?? []).filter((event) => !seasonId || event.seasonId === seasonId);
  const matches =
    role === "TABULATOR"
      ? seasonEvents.flatMap((e) => e.matches.map((m) => ({ ...m, sportEvent: e })))
      : (adminMatches ?? []);
  const sessions =
    role === "TABULATOR"
      ? seasonEvents.flatMap((e) => (e.schedules ?? []).map((s) => ({ ...s, sportEvent: e })))
      : (adminSessions ?? []);

  const items: ScoreboardItem[] = [
    ...matches.map((match) => ({
      kind: "match" as const,
      id: match.id,
      status: match.status,
      scheduledAt: match.scheduledAt,
      href: `/scoreboard/${match.id}`,
      match,
    })),
    ...sessions.map((game) => ({
      kind: "session" as const,
      id: game.id,
      status: game.status,
      scheduledAt: game.scheduledAt,
      href: `/scoreboard/session/${game.id}`,
      session: game,
    })),
  ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const active = items.filter((item) => item.status === "SCHEDULED" || item.status === "LIVE");
  const postponed = items.filter((item) => item.status === "POSTPONED");
  const finished = items.filter((item) => item.status === "FINISHED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scoreboard"
        description="Score live group matches and solo sessions. Tabulators request admin approval before going live. Admins can correct a finished score with a reason."
        actions={
          <Select value={seasonId ?? ""} onValueChange={(value) => setSeasonId(value ?? undefined)} items={seasonItems}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !items.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Radio className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No games yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "TABULATOR"
              ? "You have no assigned events with matches or solo sessions."
              : "Schedule a group match or solo session to get started."}
          </p>
        </div>
      ) : (
        <>
          <ItemSection title="Active" empty="No live or upcoming games right now." items={active} />
          <ItemSection
            title="Postponed"
            hint="Locked until resumed. Tabulators need admin approval before they can start again."
            empty="No postponed games."
            items={postponed}
          />
          <ItemSection
            title="Finished"
            hint="Finished scores stay locked for tabulators. An admin can correct them with a reason."
            items={finished}
          />
        </>
      )}
    </div>
  );
}

function ItemSection({
  title,
  hint,
  empty,
  items,
}: {
  title: string;
  hint?: string;
  empty?: string;
  items: ScoreboardItem[];
}) {
  if (!items.length && !empty) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {!items.length ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            item.kind === "match" ? <MatchCard key={item.id} match={item.match} /> : <SessionCard key={item.id} session={item.session} />,
          )}
        </div>
      )}
    </section>
  );
}

function MatchCard({ match: m }: { match: Match }) {
  const locked = m.status === "FINISHED" || m.status === "POSTPONED";
  return (
    <Link href={`/scoreboard/${m.id}`}>
      <Card className="h-full border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10">
        <CardContent className="flex h-full flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.sportEvent?.name}</span>
            <Badge className={statusStyles[m.status] ?? ""}>
              {locked && <Lock className="mr-1 size-3" />}
              {m.status}
            </Badge>
          </div>
          <p className="font-semibold tracking-tight">
            {m.homeTeam.name} vs {m.awayTeam.name}
          </p>
          {m.status === "FINISHED" || m.status === "LIVE" ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {m.homeScore} – {m.awayScore}
            </p>
          ) : null}
          {m.status === "SCHEDULED" && m.controlApprovedAt ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Approved to go live</p>
          ) : null}
          {m.status === "SCHEDULED" && m.controlRequestedAt && !m.controlApprovedAt ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Waiting for admin approval</p>
          ) : null}
          {m.status === "POSTPONED" && m.postponeReason ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Reason: {m.postponeReason}</p>
          ) : null}
          {m.status === "POSTPONED" && m.resumeApprovedAt ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Approved to resume</p>
          ) : null}
          {m.status === "POSTPONED" && m.resumeRequestedAt && !m.resumeApprovedAt ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Waiting for admin approval</p>
          ) : null}
          <p className="mt-auto text-xs text-muted-foreground">{format.dateTime(m.scheduledAt)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function SessionCard({ session: s }: { session: EventSchedule }) {
  const locked = s.status === "FINISHED" || s.status === "POSTPONED";
  const { home, away } = sessionSides(s.scores);
  return (
    <Link href={`/scoreboard/session/${s.id}`}>
      <Card className="h-full border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10">
        <CardContent className="flex h-full flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.sportEvent?.name} · Solo
            </span>
            <Badge className={statusStyles[s.status] ?? ""}>
              {locked && <Lock className="mr-1 size-3" />}
              {s.status}
            </Badge>
          </div>
          <p className="font-semibold tracking-tight">{sessionVsLabel(s.scores, s.title || "Solo session")}</p>
          {(s.status === "FINISHED" || s.status === "LIVE") && home && away ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {home.score} – {away.score}
            </p>
          ) : null}
          {s.status === "SCHEDULED" && s.controlApprovedAt ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Approved to go live</p>
          ) : null}
          {s.status === "SCHEDULED" && s.controlRequestedAt && !s.controlApprovedAt ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Waiting for admin approval</p>
          ) : null}
          {s.status === "POSTPONED" && s.postponeReason ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Reason: {s.postponeReason}</p>
          ) : null}
          {s.status === "POSTPONED" && s.resumeApprovedAt ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Approved to resume</p>
          ) : null}
          {s.status === "POSTPONED" && s.resumeRequestedAt && !s.resumeApprovedAt ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Waiting for admin approval</p>
          ) : null}
          <p className="mt-auto text-xs text-muted-foreground">{format.dateTime(s.scheduledAt)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
