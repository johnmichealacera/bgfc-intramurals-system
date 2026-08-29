"use client";

import useSWR from "swr";
import { Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/lib/api-client";
import { format } from "@/lib/format";
import type { Match } from "@/lib/types";

export default function LivePage() {
  const { data: matches, isLoading } = useSWR<Match[]>("/api/public/live-matches", fetcher, {
    refreshInterval: 4000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live Scores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Updates automatically every few seconds.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !matches?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-16 text-center">
          <Radio className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No matches are live right now</p>
          <p className="mt-1 text-xs text-muted-foreground">Check back during a scheduled event.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((m) => (
            <div
              key={m.id}
              className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.sportEvent?.name}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
                  LIVE
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: m.homeTeam.colorHex }} />
                  <p className="truncate text-sm font-semibold">{m.homeTeam.name}</p>
                </div>
                <p className="text-2xl font-bold tabular-nums">{m.homeScore}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: m.awayTeam.colorHex }} />
                  <p className="truncate text-sm font-semibold">{m.awayTeam.name}</p>
                </div>
                <p className="text-2xl font-bold tabular-nums">{m.awayScore}</p>
              </div>
              {m.venue && <p className="mt-4 text-xs text-muted-foreground">{m.venue} · {format.time(m.scheduledAt)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
