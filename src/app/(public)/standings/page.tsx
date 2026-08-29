"use client";

import useSWR from "swr";
import { ListOrdered } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api-client";
import type { StandingRow } from "@/lib/types";

// Standard competition ranking: teams tied on points share the same rank (1, 1, 3 — not 1, 2, 3).
function computeRanks(standings: StandingRow[]): number[] {
  return standings.map((row, idx) =>
    idx === 0 || row.totalPoints !== standings[idx - 1].totalPoints ? idx + 1 : -1,
  ).map((rank, idx, ranks) => (rank === -1 ? ranks[idx - 1] : rank));
}

export default function StandingsPage() {
  const { data: standings, isLoading } = useSWR<StandingRow[]>("/api/public/standings", fetcher, {
    refreshInterval: 15000,
  });
  const ranks = standings ? computeRanks(standings) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overall Standings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Total points earned across all finalized events this season.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !standings?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-16 text-center">
          <ListOrdered className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No results yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Results will appear here once events are finalized.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <ul className="divide-y divide-border/60">
            {standings.map((row, idx) => {
              const rank = ranks[idx];
              return (
                <li key={row.team.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                      rank === 1
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : rank === 2
                          ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                          : rank === 3
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {rank}
                  </span>
                  <span className="size-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: row.team.colorHex }} />
                  <p className="flex-1 truncate font-medium">{row.team.name}</p>
                  <p className="text-lg font-semibold tabular-nums">{row.totalPoints}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
