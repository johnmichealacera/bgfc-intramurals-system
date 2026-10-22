"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, Swords, ListOrdered, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/api-client";
import { eventCategoryLabel, format } from "@/lib/format";
import type { Match, SportEvent, SportEventCategory, SportEventStatus } from "@/lib/types";

const statusStyles: Record<SportEventStatus, string> = {
  UPCOMING: "bg-muted text-muted-foreground",
  ONGOING: "bg-primary/15 text-primary",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const CATEGORY_ORDER: (SportEventCategory | "OTHER")[] = ["MEN", "WOMEN", "MIXED", "OTHER"];
const CATEGORY_HEADINGS: Record<SportEventCategory | "OTHER", string> = {
  MEN: "Men's Division",
  WOMEN: "Women's Division",
  MIXED: "Mixed Division",
  OTHER: "Open / Unspecified",
};

function eventGroup(event: SportEvent): SportEventCategory | "OTHER" {
  return event.category ?? "OTHER";
}

export default function SchedulePage() {
  const { data: events, isLoading } = useSWR<SportEvent[]>("/api/public/events", fetcher);
  const postponed = (events ?? []).flatMap((event) =>
    (event.matches ?? []).map((match) => ({ event, match })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events &amp; Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Events by division. Postponed games stay listed here and are locked until they are rescheduled.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !events?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-16 text-center">
          <CalendarDays className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No events yet</p>
        </div>
      ) : (
        <>
          {postponed.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/8 shadow-lg">
              <div className="flex items-center gap-2 border-b border-amber-500/20 px-5 py-3">
                <Lock className="size-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold">Postponed games</p>
              </div>
              <ul className="divide-y divide-amber-500/15">
                {postponed.map(({ event, match }) => (
                  <PostponedRow key={match.id} event={event} match={match} />
                ))}
              </ul>
            </section>
          )}

          {CATEGORY_ORDER.map((group) => {
            const grouped = events.filter((event) => eventGroup(event) === group);
            if (!grouped.length) return null;
            return (
              <section key={group} className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight">{CATEGORY_HEADINGS[group]}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {grouped.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function PostponedRow({ event, match }: { event: SportEvent; match: Match }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {event.name}
          {event.category ? ` · ${eventCategoryLabel(event.category)}` : ""}
        </p>
        <p className="font-medium">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {format.dateTime(match.scheduledAt)}
          {match.venue ? ` · ${match.venue}` : ""}
        </p>
      </div>
      <Badge className="shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <Lock className="mr-1 size-3" />
        Locked
      </Badge>
    </li>
  );
}

function EventCard({ event }: { event: SportEvent }) {
  const postponedCount = event.matches?.length ?? 0;
  return (
    <Link
      href={`/schedule/${event.id}`}
      className="rounded-xl border border-border/70 bg-card/85 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {event.type === "TEAM_VS_TEAM" ? <Swords className="size-3.5" /> : <ListOrdered className="size-3.5" />}
          {event.type === "TEAM_VS_TEAM" ? "Team vs. Team" : "Placement"}
        </span>
        <Badge className={statusStyles[event.status]}>{event.status}</Badge>
      </div>
      <p className="mt-2 font-semibold tracking-tight">
        {event.name}
        {event.category && (
          <span className="ml-1.5 font-normal text-muted-foreground">({eventCategoryLabel(event.category)})</span>
        )}
      </p>
      {event.type === "PLACEMENT" && event.schedules?.[0] && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Next: {format.dateTime(event.schedules[0].scheduledAt)}
          {event.schedules[0].venue ? ` · ${event.schedules[0].venue}` : ""}
        </p>
      )}
      {event.type === "TEAM_VS_TEAM" && event._count?.matches != null && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {event._count.matches} match{event._count.matches === 1 ? "" : "es"}
          {postponedCount > 0 ? ` · ${postponedCount} postponed` : ""}
        </p>
      )}
    </Link>
  );
}
