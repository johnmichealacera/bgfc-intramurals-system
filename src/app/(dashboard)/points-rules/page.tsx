"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, ListOrdered } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { PlacementPointsRule } from "@/lib/types";

type Row = { placement: string; points: string };

export default function PointsRulesPage() {
  const queryClient = useQueryClient();
  const { seasons, seasonId, setSeasonId } = useSelectedSeason();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadedForSeasonId, setLoadedForSeasonId] = useState<string | undefined>(undefined);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["points-rules", seasonId],
    queryFn: () => apiFetch<PlacementPointsRule[]>(`/api/points-rules?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  if (rules && seasonId !== loadedForSeasonId) {
    setLoadedForSeasonId(seasonId);
    setRows(rules.map((r) => ({ placement: String(r.placement), points: String(r.points) })));
  }

  const saveMutation = useMutation({
    mutationFn: (payload: { placement: number; points: number }[]) =>
      apiFetch(`/api/points-rules`, { method: "PUT", body: JSON.stringify({ seasonId, rules: payload }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-rules", seasonId] });
      toast.success("Points rules saved");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to save points rules"),
  });

  function handleSave() {
    const payload = rows
      .filter((r) => r.placement.trim() !== "" && r.points.trim() !== "")
      .map((r) => ({ placement: Number(r.placement), points: Number(r.points) }));
    if (!payload.length) {
      toast.error("Add at least one rule");
      return;
    }
    saveMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points Rules"
        description="Configure how many overall points a team earns for each event placement."
        actions={
          <Select value={seasonId ?? ""} onValueChange={(value) => setSeasonId(value ?? undefined)}>
            <SelectTrigger className="w-48">
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
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <CardContent className="space-y-4 p-5">
            {rows.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
                <ListOrdered className="mb-2 size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No points rules yet for this season.</p>
              </div>
            )}
            {rows.map((row, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Placement</Label>
                  <Input
                    type="number"
                    min={1}
                    className="w-28"
                    value={row.placement}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, placement: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Points</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-28"
                    value={row.points}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, points: e.target.value } : r)))
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setRows((prev) => [...prev, { placement: String(prev.length + 1), points: "" }])}
              >
                <Plus className="size-4" />
                Add Row
              </Button>
              <Button size="sm" className="gap-2" disabled={saveMutation.isPending} onClick={handleSave}>
                <Save className="size-4" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
