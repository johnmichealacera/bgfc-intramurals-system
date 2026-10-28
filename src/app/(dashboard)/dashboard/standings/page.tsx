"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { StandingsBoard } from "@/components/standings-board";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { StandingRow } from "@/lib/types";

export default function DashboardStandingsPage() {
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const { data: standings, isLoading } = useQuery({
    queryKey: ["public", "standings", seasonId],
    queryFn: () => apiFetch<StandingRow[]>(`/api/public/standings?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overall Standings"
        description="Finished games add points. Gold, silver, and bronze count 1st, 2nd, and 3rd from finalized events."
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
        <Link href="/dashboard/medals" className="font-medium text-primary underline-offset-4 hover:underline">
          Open medal tally
        </Link>
      </p>
      {isLoading || !seasonId ? <Skeleton className="h-96 rounded-2xl" /> : <StandingsBoard rows={standings ?? []} />}
    </div>
  );
}
