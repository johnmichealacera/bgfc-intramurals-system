"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, Swords, ListOrdered } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/api-client";
import { eventCategoryLabel, eventTypeLabel, format, sessionVsLabel } from "@/lib/format";
import type { MatchStatus, SportEvent, SportEventCategory, SportEventStatus } from "@/lib/types";

const eventStatusStyles: Record<SportEventStatus, string> = {
  UPCOMING: "bg-muted text-muted-foreground",
  ONGOING: "bg-primary/15 text-primary",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const gameStatusStyles: Record<MatchStatus, string> = {
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  LIVE: "bg-destructive/10 text-destructive",
  SCHEDULED: "bg-muted text-muted-foreground",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const GAME_STATUS_LABEL: Record<MatchStatus, string> = {
  POSTPONED: "Postponed",
  LIVE: "Live",
  SCHEDULED: "Upcoming",
  FINISHED: "Finished",
};

const STATUS_RANK: Record<MatchStatus, number> = {
  FINISHED: 0,
  POSTPONED: 1,
  LIVE: 2,
  SCHEDULED: 3,
};

const CATEGORY_ORDER: (SportEventCategory | "OTHER")[] = ["MEN", "WOMEN", "MIXED", "OTHER"];
const CATEGORY_HEADINGS: Record<SportEventCategory | "OTHER", string> = {
  MEN: "Men's Division",
  WOMEN: "Women's Division",
  MIXED: "Mixed Division",
  OTHER: "Open / Unspecified",
};

type EventGame =
  | { kind: "match"; id: string; status: MatchStatus; scheduledAt: string; venue: string | null; title: string }
  | { kind: "session"; id: string; status: MatchStatus; scheduledAt: string; venue: string | null; title: string };

function eventGroup(event: SportEvent): SportEventCategory | "OTHER" {
  return event.category ?? "OTHER";
}

function eventGames(event: SportEvent): EventGame[] {
  const matches: EventGame[] = (event.matches ?? []).map((match) => ({
    kind: "match",
    id: match.id,
    status: match.status,
    scheduledAt: match.scheduledAt,
    venue: match.venue,
    title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
  }));
  const sessions: EventGame[] = (event.schedules ?? []).map((session) => ({
    kind: "session",
    id: session.id,
    status: session.status,
    scheduledAt: session.scheduledAt,
    venue: session.venue,
    title:
      (session.scores?.length ?? 0) >= 3
        ? session.title || sessionVsLabel(session.scores, "Session")
        : sessionVsLabel(session.scores, session.title || "Session"),
  }));
  return [...matches, ...sessions].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
}

export default function SchedulePage() {
  const { data: events, isLoading } = useSWR<SportEvent[]>("/api/public/events", fetcher, {
    refreshInterval: 8000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events &amp; Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Games listed by event. Finished first, then postponed, live, and upcoming.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !events?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-16 text-center">
          <CalendarDays className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No events yet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {CATEGORY_ORDER.map((group) => {
            const grouped = events.filter((event) => eventGroup(event) === group);
            if (!grouped.length) return null;
            const wide = group === "MIXED" || group === "OTHER";
            return (
              <section key={group} className={`space-y-3 ${wide ? "md:col-span-2" : ""}`}>
                <h2 className="text-sm font-semibold tracking-tight">{CATEGORY_HEADINGS[group]}</h2>
                <div className={wide ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
                  {grouped.map((event) => (
                    <EventGamesCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventGamesCard({ event }: { event: SportEvent }) {
  const games = eventGames(event);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
      <Link
        href={`/schedule/${event.id}`}
        className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4 transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {event.type === "TEAM_VS_TEAM" ? <Swords className="size-3.5" /> : <ListOrdered className="size-3.5" />}
            {eventTypeLabel(event.type)}
          </p>
          <p className="font-semibold tracking-tight">
            {event.name}
            {event.category && (
              <span className="ml-1.5 font-normal text-muted-foreground">({eventCategoryLabel(event.category)})</span>
            )}
          </p>
        </div>
        <Badge className={eventStatusStyles[event.status]}>{event.status}</Badge>
      </Link>
      {games.length === 0 ? (
        <p className="px-5 py-4 text-xs text-muted-foreground">No games scheduled yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {games.map((game) => (
            <li key={`${game.kind}-${game.id}`} className="flex items-start justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{game.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format.dateTime(game.scheduledAt)}
                  {game.venue ? ` · ${game.venue}` : ""}
                </p>
              </div>
              <Badge className={`shrink-0 ${gameStatusStyles[game.status]}`}>{GAME_STATUS_LABEL[game.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
