"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { MedalPodium, StandingsBoard } from "@/components/standings-board";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { StandingRow } from "@/lib/types";

export default function DashboardMedalsPage() {
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const { data: standings, isLoading } = useQuery({
    queryKey: ["public", "standings", seasonId],
    queryFn: () => apiFetch<StandingRow[]>(`/api/public/standings?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medal Tally"
        description="Gold for champion, silver for 2nd, bronze for 3rd — counted when an event is finalized."
        actions={
          seasons.length > 0 ? (
            <Select value={seasonId ?? ""} onValueChange={(value) => setSeasonId(value ?? undefined)} items={seasonItems}>
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
          ) : undefined
        }
      />
      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard/standings" className="font-medium text-primary underline-offset-4 hover:underline">
          Open overall standings
        </Link>
      </p>
      {isLoading || !seasonId ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <MedalPodium rows={standings ?? []} />
          <StandingsBoard
            rows={standings ?? []}
            sort="medals"
            emptyHint="Finalize event results to award gold, silver, and bronze."
          />
        </>
      )}
    </div>
  );
}
