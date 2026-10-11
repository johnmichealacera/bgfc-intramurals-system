"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Trophy, Radio, Crown, CalendarClock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { eventCategoryLabel, format } from "@/lib/format";
import type { EventSchedule, Match, Season, SportEvent, StandingRow, Team } from "@/lib/types";

function StatCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br opacity-90 blur-2xl ${accent}`} aria-hidden />
      <CardContent className="relative flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ring-1 ring-inset ring-black/5 dark:ring-white/10 ${accent}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user.role;
  const name = session?.user.name?.split(" ")[0] ?? "there";

  const { data: activeSeason } = useQuery({
    queryKey: ["public", "active-season"],
    queryFn: () => apiFetch<Season | null>("/api/public/seasons/active"),
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams", activeSeason?.id],
    queryFn: () => apiFetch<Team[]>(`/api/teams?seasonId=${activeSeason!.id}`),
    enabled: role === "ADMIN" && !!activeSeason,
  });

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["events", activeSeason?.id],
    queryFn: () => apiFetch<SportEvent[]>(`/api/events?seasonId=${activeSeason!.id}`),
    enabled: role === "ADMIN" && !!activeSeason,
  });

  const { data: liveMatches, isLoading: loadingLive } = useQuery({
    queryKey: ["public", "live-matches"],
    queryFn: () => apiFetch<Match[]>("/api/public/live-matches"),
    enabled: role === "ADMIN",
  });

  const { data: standings, isLoading: loadingStandings } = useQuery({
    queryKey: ["public", "standings"],
    queryFn: () => apiFetch<StandingRow[]>("/api/public/standings"),
    enabled: role === "ADMIN",
  });

  const { data: myEvents, isLoading: loadingMyEvents } = useQuery({
    queryKey: ["tabulator", "my-events"],
    queryFn: () => apiFetch<(SportEvent & { matches: Match[]; schedules: EventSchedule[] })[]>("/api/tabulator/my-events"),
    enabled: role === "TABULATOR",
  });

  const leader = standings?.[0];
  const tiedLeaders = standings?.filter((s) => s.totalPoints === leader?.totalPoints) ?? [];
  const leaderLabel = tiedLeaders.length > 1 ? `${tiedLeaders.length} teams tied` : (leader?.team.name ?? "—");
  const myLiveMatches = (myEvents ?? []).flatMap((e) => e.matches).filter((m) => m.status === "LIVE");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Trophy className="size-3.5 text-primary" />
            {activeSeason?.name ?? "No active season"}
          </p>
          <h1 className="mt-3 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, <span className="bg-linear-to-r from-primary to-teal-600 bg-clip-text text-transparent">{name}</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {role === "ADMIN"
              ? "Here's a live overview of this season's intramurals."
              : "Here are the events and matches assigned to you."}
          </p>
        </div>
      </section>

      {role === "ADMIN" && (
        <section className="grid gap-4 md:grid-cols-4">
          {loadingTeams || loadingEvents || loadingLive || loadingStandings ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          ) : (
            <>
              <StatCard
                label="Total Teams"
                value={String(teams?.length ?? 0)}
                helper="in the active season"
                icon={<Shield className="size-5 text-primary" />}
                accent="from-primary/15 to-primary/0 text-primary"
              />
              <StatCard
                label="Ongoing Events"
                value={String(events?.filter((e) => e.status === "ONGOING").length ?? 0)}
                helper={`of ${events?.length ?? 0} total`}
                icon={<CalendarClock className="size-5 text-teal-600 dark:text-teal-400" />}
                accent="from-teal-500/15 to-teal-500/0 text-teal-600 dark:text-teal-400"
              />
              <StatCard
                label="Live Matches Now"
                value={String(liveMatches?.length ?? 0)}
                helper="across all events"
                icon={<Radio className="size-5 text-destructive" />}
                accent="from-destructive/15 to-destructive/0 text-destructive"
              />
              <StatCard
                label="Current Point Leader"
                value={!leader || leader.totalPoints === 0 ? "—" : leaderLabel}
                helper={!leader || leader.totalPoints === 0 ? "No results yet" : `${leader.totalPoints} points`}
                icon={<Crown className="size-5 text-emerald-600 dark:text-emerald-400" />}
                accent="from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400"
              />
            </>
          )}
        </section>
      )}

      {role === "TABULATOR" && (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            {loadingMyEvents ? (
              [1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
            ) : (
              <>
                <StatCard
                  label="My Assigned Events"
                  value={String(myEvents?.length ?? 0)}
                  icon={<Trophy className="size-5 text-primary" />}
                  accent="from-primary/15 to-primary/0 text-primary"
                />
                <StatCard
                  label="My Live Matches"
                  value={String(myLiveMatches.length)}
                  helper="open Scoreboard to update scores"
                  icon={<Radio className="size-5 text-destructive" />}
                  accent="from-destructive/15 to-destructive/0 text-destructive"
                />
              </>
            )}
          </section>

          <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Assigned Events</CardTitle>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Live matches can be controlled or updated from the{" "}
                  <Link href="/scoreboard" className="font-medium text-primary underline-offset-4 hover:underline">
                    Scoreboard
                  </Link>{" "}
                  page. Events with no matches yet will not appear there until an admin schedules them.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                render={<Link href="/scoreboard" />}
                nativeButton={false}
              >
                Open Scoreboard
                <ArrowRight className="size-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMyEvents ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : !myEvents?.length ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-10 text-center">
                  <Trophy className="mx-auto mb-2 size-7 text-muted-foreground" />
                  <p className="text-sm font-medium">No events assigned yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    An admin will assign you to events when you need to score matches.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {myEvents.map((event) => {
                    const liveCount = event.matches.filter((m) => m.status === "LIVE").length;
                    const isLive = liveCount > 0;
                    const hasMatches = event.matches.length > 0;
                    const isPlacement = event.type === "PLACEMENT";
                    const sessionCount = event.schedules?.length ?? 0;
                    const nextSession = event.schedules?.[0];
                    return (
                      <li key={event.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate font-medium tracking-tight">
                            {event.name}
                            {event.category ? (
                              <span className="text-muted-foreground"> · {eventCategoryLabel(event.category)}</span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {isPlacement
                              ? sessionCount === 0
                                ? "Placement event — results are entered on the event page (not Scoreboard)"
                                : `Placement · ${sessionCount} public session${sessionCount === 1 ? "" : "s"}${
                                    nextSession ? ` · next ${format.dateTime(nextSession.scheduledAt)}` : ""
                                  }`
                              : !hasMatches
                                ? "No matches scheduled — will not show on Scoreboard yet"
                                : isLive
                                  ? `${event.matches.length} match${event.matches.length === 1 ? "" : "es"} · ${liveCount} live now`
                                  : `${event.matches.length} match${event.matches.length === 1 ? "" : "es"}`}
                          </p>
                        </div>
                        <Badge
                          className={
                            isLive
                              ? "shrink-0 bg-destructive/10 text-destructive"
                              : "shrink-0 bg-muted text-muted-foreground"
                          }
                        >
                          {isLive ? "Live" : "Not live"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
