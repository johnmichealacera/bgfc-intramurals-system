"use client";

import { useState } from "react";
import useSWR from "swr";
import { ListOrdered } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api-client";
import type { Season, StandingRow } from "@/lib/types";

function computeRanks(standings: StandingRow[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < standings.length; i++) {
    ranks.push(i === 0 || standings[i].totalPoints !== standings[i - 1].totalPoints ? i + 1 : ranks[i - 1]);
  }
  return ranks;
}

export default function StandingsPage() {
  const { data: seasons } = useSWR<Season[]>("/api/public/seasons", fetcher);
  const activeSeasonId = seasons?.find((s) => s.isActive)?.id ?? seasons?.[0]?.id;
  const [manualSeasonId, setManualSeasonId] = useState<string | undefined>();
  const seasonId = manualSeasonId ?? activeSeasonId;
  const seasonItems = Object.fromEntries((seasons ?? []).map((s) => [s.id, s.name]));

  const { data: standings, isLoading } = useSWR<StandingRow[]>(
    seasonId ? `/api/public/standings?seasonId=${seasonId}` : null,
    fetcher,
    { refreshInterval: 5000 },
  );
  const ranks = standings ? computeRanks(standings) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overall Standings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Teams start at 0. A finished game gives 2 points to the winner (1 each if tied).
          </p>
        </div>
        {seasons && seasons.length > 0 && (
          <Select value={seasonId ?? ""} onValueChange={(value) => setManualSeasonId(value ?? undefined)} items={seasonItems}>
            <SelectTrigger className="w-56">
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
        )}
      </div>

      {isLoading || !seasonId ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !standings?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-16 text-center">
          <ListOrdered className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No teams yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add teams for this season to start the standings.</p>
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
