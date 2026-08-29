import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Season } from "@/lib/types";

export function useSelectedSeason() {
  const { data: seasons, isLoading } = useQuery({
    queryKey: ["seasons"],
    queryFn: () => apiFetch<Season[]>("/api/seasons"),
  });
  const [manualSeasonId, setManualSeasonId] = useState<string | undefined>(undefined);

  const defaultSeasonId = seasons?.length ? (seasons.find((s) => s.isActive)?.id ?? seasons[0].id) : undefined;
  const seasonId = manualSeasonId ?? defaultSeasonId;

  // Lets <Select items={seasonItems}> show each season's name instead of its raw id.
  const seasonItems = useMemo(
    () => Object.fromEntries((seasons ?? []).map((s) => [s.id, s.name])),
    [seasons],
  );

  return { seasons: seasons ?? [], seasonItems, seasonId, setSeasonId: setManualSeasonId, isLoading };
}
