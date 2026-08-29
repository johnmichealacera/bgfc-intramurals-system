"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarDays, Swords, ListOrdered } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/api-client";
import type { SportEvent, SportEventStatus } from "@/lib/types";

const statusStyles: Record<SportEventStatus, string> = {
  UPCOMING: "bg-muted text-muted-foreground",
  ONGOING: "bg-primary/15 text-primary",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export default function SchedulePage() {
  const { data: events, isLoading } = useSWR<SportEvent[]>("/api/public/events", fetcher);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events &amp; Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">All events for the current season.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <Link
              key={event.id}
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
              <p className="mt-2 font-semibold tracking-tight">{event.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
