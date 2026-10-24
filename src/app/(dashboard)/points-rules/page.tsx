"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, ListOrdered, Swords, Trophy } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { PlacementPointsRule, SportEventType } from "@/lib/types";

type Row = { placement: string; points: string };

function toRows(rules: PlacementPointsRule[]) {
  return rules.map((r) => ({ placement: String(r.placement), points: String(r.points) }));
}

export default function PointsRulesPage() {
  const queryClient = useQueryClient();
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const [groupRows, setGroupRows] = useState<Row[]>([]);
  const [soloRows, setSoloRows] = useState<Row[]>([]);
  const [loadedForSeasonId, setLoadedForSeasonId] = useState<string | undefined>(undefined);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["points-rules", seasonId],
    queryFn: () => apiFetch<PlacementPointsRule[]>(`/api/points-rules?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  if (rules && seasonId !== loadedForSeasonId) {
    setLoadedForSeasonId(seasonId);
    setGroupRows(toRows(rules.filter((r) => r.eventType === "TEAM_VS_TEAM")));
    setSoloRows(toRows(rules.filter((r) => r.eventType === "PLACEMENT")));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points Rules"
        description="Separate scoring tables for group and solo events. A basketball event uses the group table automatically; chess and other solo events use the solo table."
        actions={
          <Select value={seasonId ?? ""} onValueChange={(value) => setSeasonId(value ?? undefined)} items={seasonItems}>
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
        <Tabs defaultValue="TEAM_VS_TEAM">
          <TabsList>
            <TabsTrigger value="TEAM_VS_TEAM" className="gap-1.5">
              <Swords className="size-3.5" />
              Group events
            </TabsTrigger>
            <TabsTrigger value="PLACEMENT" className="gap-1.5">
              <Trophy className="size-3.5" />
              Solo events
            </TabsTrigger>
          </TabsList>
          <TabsContent value="TEAM_VS_TEAM">
            <RulesEditor
              seasonId={seasonId}
              eventType="TEAM_VS_TEAM"
              rows={groupRows}
              setRows={setGroupRows}
              emptyLabel="No group-event points yet. These apply to basketball, volleyball, and other group events."
              queryClient={queryClient}
            />
          </TabsContent>
          <TabsContent value="PLACEMENT">
            <RulesEditor
              seasonId={seasonId}
              eventType="PLACEMENT"
              rows={soloRows}
              setRows={setSoloRows}
              emptyLabel="No solo-event points yet. These apply to chess, dancesport, and other solo events."
              queryClient={queryClient}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function RulesEditor({
  seasonId,
  eventType,
  rows,
  setRows,
  emptyLabel,
  queryClient,
}: {
  seasonId: string | undefined;
  eventType: SportEventType;
  rows: Row[];
  setRows: (next: Row[] | ((prev: Row[]) => Row[])) => void;
  emptyLabel: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const saveMutation = useMutation({
    mutationFn: (payload: { placement: number; points: number }[]) =>
      apiFetch(`/api/points-rules`, {
        method: "PUT",
        body: JSON.stringify({ seasonId, eventType, rules: payload }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-rules", seasonId] });
      toast.success(eventType === "TEAM_VS_TEAM" ? "Group points saved" : "Solo points saved");
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
    <Card className="mt-3 border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
      <CardContent className="space-y-4 p-5">
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
            <ListOrdered className="mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
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
          <Button size="sm" className="gap-2" disabled={saveMutation.isPending || !seasonId} onClick={handleSave}>
            <Save className="size-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
