"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Radio, Swords } from "lucide-react";
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

const matchStatusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default function MatchesPage() {
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();

  const { data: events } = useQuery({
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

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "season", seasonId, teamEvents.map((e) => e.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        teamEvents.map((e) => apiFetch<Match[]>(`/api/matches?eventId=${e.id}`)),
      );
      return results.flat().sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    },
    enabled: teamEvents.length > 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matches"
        description="All scheduled matches across team-vs-team events for the selected season."
        actions={
          <div className="flex items-center gap-2">
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
            <ScheduleMatchDialog events={teamEvents} teams={teams ?? []} />
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !matches?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Swords className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No matches scheduled</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {teamEvents.length ? "Schedule a match to get started." : "Create a team-vs-team event first."}
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
                {matches.map((m) => (
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
                      <Badge className={matchStatusStyles[m.status]}>{m.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        render={<Link href={`/scoreboard/${m.id}`} />}
                        nativeButton={false}
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                      >
                        <Radio className="size-3.5" />
                        {m.status === "FINISHED" ? "Correct" : "Control"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
