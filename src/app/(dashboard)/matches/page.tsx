"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Radio, Swords, Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScheduleMatchDialog } from "@/components/dashboard/schedule-match-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { format } from "@/lib/format";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { EventSchedule, Match, SportEvent, Team } from "@/lib/types";

const PAGE_SIZE = 10;

const matchStatusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

type GameRow =
  | { kind: "match"; id: string; sportEventId: string; scheduledAt: string; status: Match["status"]; match: Match }
  | { kind: "session"; id: string; sportEventId: string; scheduledAt: string; status: EventSchedule["status"]; session: EventSchedule };

export default function MatchesPage() {
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const [sportId, setSportId] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["events", seasonId],
    queryFn: () => apiFetch<SportEvent[]>(`/api/events?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });
  const teamEvents = (events ?? []).filter((e) => e.type === "TEAM_VS_TEAM");

  const { data: teams } = useQuery({
    queryKey: ["teams", seasonId],
    queryFn: () => apiFetch<Team[]>(`/api/teams?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const { data: matches, isLoading: loadingMatches } = useQuery({
    queryKey: ["matches", "season", seasonId],
    queryFn: () => apiFetch<Match[]>(`/api/matches?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["schedules", "season", seasonId],
    queryFn: () => apiFetch<EventSchedule[]>(`/api/schedules?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const sportItems = useMemo(
    () => ({ ALL: "All sports", ...Object.fromEntries((events ?? []).map((e) => [e.id, e.name])) }),
    [events],
  );

  const rows = useMemo<GameRow[]>(() => {
    const games: GameRow[] = [
      ...(matches ?? []).map((match) => ({
        kind: "match" as const,
        id: match.id,
        sportEventId: match.sportEventId,
        scheduledAt: match.scheduledAt,
        status: match.status,
        match,
      })),
      ...(sessions ?? []).map((session) => ({
        kind: "session" as const,
        id: session.id,
        sportEventId: session.sportEventId,
        scheduledAt: session.scheduledAt,
        status: session.status,
        session,
      })),
    ];
    return games
      .filter((game) => sportId === "ALL" || game.sportEventId === sportId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [matches, sessions, sportId]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, rows.length);

  const isLoading = !seasonId || loadingEvents || loadingMatches || loadingSessions;

  function changeSeason(value: string | null) {
    setSeasonId(value ?? undefined);
    setSportId("ALL");
    setPage(1);
  }

  function changeSport(value: string | null) {
    setSportId(value ?? "ALL");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matches"
        description="All group matches and solo sessions for the selected season."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={seasonId ?? ""} onValueChange={changeSeason} items={seasonItems}>
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
            <Select value={sportId} onValueChange={changeSport} items={sportItems}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All sports</SelectItem>
                {(events ?? []).map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScheduleMatchDialog events={teamEvents} teams={teams ?? []} />
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !rows.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Swords className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No games scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {events?.length ? "Schedule a group match or solo session to get started." : "Create an event first."}
          </p>
        </div>
      ) : (
        <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Matchup</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) =>
                  row.kind === "match" ? (
                    <MatchRow key={row.id} match={row.match} />
                  ) : (
                    <SessionRow key={row.id} session={row.session} />
                  ),
                )}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {rows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {safePage} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MatchRow({ match: m }: { match: Match }) {
  const locked = m.status === "FINISHED" || m.status === "POSTPONED";
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{m.sportEvent?.name}</TableCell>
      <TableCell className="font-medium">
        {m.homeTeam.name} vs {m.awayTeam.name}
      </TableCell>
      <TableCell className="tabular-nums">
        {m.homeScore} – {m.awayScore}
      </TableCell>
      <TableCell className="text-muted-foreground">{format.dateTime(m.scheduledAt)}</TableCell>
      <TableCell>
        <Badge className={matchStatusStyles[m.status]}>
          {locked && <Lock className="mr-1 size-3" />}
          {m.status}
        </Badge>
        {m.status === "POSTPONED" && m.postponeReason && (
          <p className="mt-1 max-w-48 text-xs text-amber-700 dark:text-amber-400">{m.postponeReason}</p>
        )}
      </TableCell>
      <TableCell>
        <ControlButton href={`/scoreboard/${m.id}`} status={m.status} />
      </TableCell>
    </TableRow>
  );
}

function SessionRow({ session: s }: { session: EventSchedule }) {
  const locked = s.status === "FINISHED" || s.status === "POSTPONED";
  const scores = s.scores ?? [];
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{s.sportEvent?.name} · Solo</TableCell>
      <TableCell className="font-medium">{s.title || "Solo session"}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {scores.length ? scores.map((row) => `${row.team.name} ${row.score}`).join(" · ") : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{format.dateTime(s.scheduledAt)}</TableCell>
      <TableCell>
        <Badge className={matchStatusStyles[s.status]}>
          {locked && <Lock className="mr-1 size-3" />}
          {s.status}
        </Badge>
        {s.status === "POSTPONED" && s.postponeReason && (
          <p className="mt-1 max-w-48 text-xs text-amber-700 dark:text-amber-400">{s.postponeReason}</p>
        )}
      </TableCell>
      <TableCell>
        <ControlButton href={`/scoreboard/session/${s.id}`} status={s.status} />
      </TableCell>
    </TableRow>
  );
}

function ControlButton({ href, status }: { href: string; status: Match["status"] }) {
  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      size="sm"
      variant="outline"
      className="gap-1.5"
    >
      {status === "FINISHED" || status === "POSTPONED" ? <Lock className="size-3.5" /> : <Radio className="size-3.5" />}
      {status === "FINISHED" ? "View" : status === "POSTPONED" ? "Locked" : "Control"}
    </Button>
  );
}
