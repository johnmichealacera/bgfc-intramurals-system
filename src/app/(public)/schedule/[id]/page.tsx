"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Trophy, BookOpen, CalendarDays, Lock, GitBranch } from "lucide-react";
import { EventBracket } from "@/components/event-bracket";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/api-client";
import { format, eventCategoryLabel, eventTypeLabel } from "@/lib/format";
import { findGuidelineForEventName } from "@/lib/sports-guidelines";
import type { SportEventDetail } from "@/lib/types";

const matchStatusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default function PublicEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: event, isLoading } = useSWR<SportEventDetail>(`/api/public/events/${id}`, fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading || !event) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const guideline = findGuidelineForEventName(event.name);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {eventTypeLabel(event.type)}
          {event.category && ` · ${eventCategoryLabel(event.category)}`}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{event.name}</h1>
        {guideline && (
          <Link
            href={`/rules#${guideline.slug}`}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <BookOpen className="size-3.5" />
            View official {guideline.name} guidelines
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          <p className="text-sm font-semibold">
            {event.type === "TEAM_VS_TEAM" ? "Elimination Bracket" : "Finals Field"}
          </p>
        </div>
        <EventBracket
          games={event.bracketGames ?? []}
          placements={event.placements}
          fieldTeams={(event.eventTeams ?? []).map((entry) => entry.team)}
        />
      </div>

      {event.type === "TEAM_VS_TEAM" && (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          {event.matches.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No matches scheduled yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {event.matches.map((m) => {
                const locked = m.status === "POSTPONED" || m.status === "FINISHED";
                return (
                  <li
                    key={m.id}
                    className={`flex items-center justify-between gap-4 px-5 py-4 ${
                      m.status === "POSTPONED" ? "bg-amber-500/6" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">
                        {m.homeTeam.name} vs {m.awayTeam.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format.dateTime(m.scheduledAt)}
                        {m.venue ? ` · ${m.venue}` : ""}
                      </p>
                      {m.status === "POSTPONED" && m.postponeReason && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Reason: {m.postponeReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {m.status !== "POSTPONED" && (
                        <p className="text-lg font-semibold tabular-nums">
                          {m.homeScore} – {m.awayScore}
                        </p>
                      )}
                      <Badge className={matchStatusStyles[m.status]}>
                        {locked && <Lock className="mr-1 size-3" />}
                        {m.status}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {event.type === "PLACEMENT" && (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
            <CalendarDays className="size-4 text-primary" />
            <p className="text-sm font-semibold">Schedule</p>
          </div>
          {(event.schedules ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Schedule will be posted soon.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {event.schedules.map((s) => {
                const locked = s.status === "POSTPONED" || s.status === "FINISHED";
                return (
                  <li key={s.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">{s.title || "Session"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format.dateTime(s.scheduledAt)}
                        {s.venue ? ` · ${s.venue}` : ""}
                      </p>
                      {s.status === "POSTPONED" && s.postponeReason && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Reason: {s.postponeReason}</p>
                      )}
                      {s.status === "LIVE" && (s.scores ?? []).length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {s.scores?.map((row) => (
                            <li key={row.id} className="flex items-center gap-2 text-xs">
                              <span className="size-2.5 rounded-full" style={{ backgroundColor: row.team.colorHex }} />
                              <span>{row.team.name}</span>
                              <span className="tabular-nums font-semibold">{row.score}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Badge className={matchStatusStyles[s.status] ?? matchStatusStyles.SCHEDULED}>
                      {locked && <Lock className="mr-1 size-3" />}
                      {s.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <Trophy className="size-4 text-primary" />
          <p className="text-sm font-semibold">Results</p>
        </div>
        {event.placements.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Results have not been finalized yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {event.placements.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  {p.placement}
                </span>
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.team.colorHex }} />
                <p className="flex-1 font-medium">{p.team.name}</p>
                <p className="text-sm font-semibold tabular-nums">{p.points} pts</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
