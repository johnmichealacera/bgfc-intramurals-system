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
import type { Match, SportEvent, Team } from "@/lib/types";

const PAGE_SIZE = 10;

const matchStatusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

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

  const sportItems = useMemo(
    () => ({ ALL: "All sports", ...Object.fromEntries(teamEvents.map((e) => [e.id, e.name])) }),
    [teamEvents],
  );

  const filteredMatches = useMemo(() => {
    const list = matches ?? [];
    return sportId === "ALL" ? list : list.filter((m) => m.sportEventId === sportId);
  }, [matches, sportId]);

  const pageCount = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedMatches = filteredMatches.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filteredMatches.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredMatches.length);

  const isLoading = !seasonId || loadingEvents || loadingMatches;

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
        description="All scheduled matches across group events for the selected season."
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
                {teamEvents.map((event) => (
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
      ) : !filteredMatches.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Swords className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No matches scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {teamEvents.length ? "Schedule a match to get started." : "Create a group event first."}
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
                {pagedMatches.map((m) => (
                  <TableRow key={m.id}>
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
                        {(m.status === "FINISHED" || m.status === "POSTPONED") && <Lock className="mr-1 size-3" />}
                        {m.status}
                      </Badge>
                      {m.status === "POSTPONED" && m.postponeReason && (
                        <p className="mt-1 max-w-48 text-xs text-amber-700 dark:text-amber-400">{m.postponeReason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        render={<Link href={`/scoreboard/${m.id}`} />}
                        nativeButton={false}
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                      >
                        {m.status === "FINISHED" || m.status === "POSTPONED" ? (
                          <Lock className="size-3.5" />
                        ) : (
                          <Radio className="size-3.5" />
                        )}
                        {m.status === "FINISHED" ? "View" : m.status === "POSTPONED" ? "Locked" : "Control"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredMatches.length}
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
