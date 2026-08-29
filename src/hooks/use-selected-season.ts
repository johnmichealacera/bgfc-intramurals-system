import { useState } from "react";
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

  return { seasons: seasons ?? [], seasonId, setSeasonId: setManualSeasonId, isLoading };
}
