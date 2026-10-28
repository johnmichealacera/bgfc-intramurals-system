"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandingsBoard } from "@/components/standings-board";
import { fetcher } from "@/lib/api-client";
import type { Season, StandingRow } from "@/lib/types";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overall Standings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Teams start at 0. A finished game gives 2 points to the winner (1 each if tied). Gold, silver, and bronze
            go to 1st, 2nd, and 3rd on overall points.{" "}
            <Link href="/medals" className="font-medium text-primary underline-offset-4 hover:underline">
              View medal tally
            </Link>
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

      {isLoading || !seasonId ? <Skeleton className="h-96 rounded-2xl" /> : <StandingsBoard rows={standings ?? []} />}
    </div>
  );
}
