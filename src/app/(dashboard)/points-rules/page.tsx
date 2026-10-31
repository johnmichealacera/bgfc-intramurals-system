"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, ListOrdered } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useSelectedSeason } from "@/hooks/use-selected-season";
import type { PointsSystem, SportEventType } from "@/lib/types";

type Row = { placement: string; points: string };

function toRows(system: PointsSystem) {
  return system.rules.map((r) => ({ placement: String(r.placement), points: String(r.points) }));
}

function suggestionLabel(type: SportEventType | null) {
  if (type === "TEAM_VS_TEAM") return "Suggested for group";
  if (type === "PLACEMENT") return "Suggested for solo";
  return null;
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  suggestedType: z.enum(["NONE", "TEAM_VS_TEAM", "PLACEMENT"]),
});
type CreateValues = z.infer<typeof createSchema>;

const SUGGEST_ITEMS = {
  NONE: "No suggestion",
  TEAM_VS_TEAM: "Suggest for group events",
  PLACEMENT: "Suggest for solo events",
};

export default function PointsRulesPage() {
  const queryClient = useQueryClient();
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const [open, setOpen] = useState(false);
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", suggestedType: "NONE" },
  });

  const { data: systems, isLoading } = useQuery({
    queryKey: ["points-systems", seasonId],
    queryFn: () => apiFetch<PointsSystem[]>(`/api/points-systems?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) =>
      apiFetch<PointsSystem>("/api/points-systems", {
        method: "POST",
        body: JSON.stringify({
          seasonId,
          name: values.name,
          suggestedType: values.suggestedType === "NONE" ? null : values.suggestedType,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-systems", seasonId] });
      toast.success("Point system created");
      setOpen(false);
      form.reset({ name: "", suggestedType: "NONE" });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to create point system"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points Rules"
        description="Create named point systems and assign any of them to an event. Group and solo are only suggestions when you create an event."
        actions={
          <div className="flex items-center gap-2">
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
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="gap-2" disabled={!seasonId} />}>
                <Plus className="size-4" />
                New point system
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New point system</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="system-name">Name</Label>
                    <Input id="system-name" placeholder="Literary" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Suggest when creating</Label>
                    <Select
                      value={form.watch("suggestedType")}
                      onValueChange={(value) => form.setValue("suggestedType", (value as CreateValues["suggestedType"]) ?? "NONE")}
                      items={SUGGEST_ITEMS}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No suggestion</SelectItem>
                        <SelectItem value="TEAM_VS_TEAM">Suggest for group events</SelectItem>
                        <SelectItem value="PLACEMENT">Suggest for solo events</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The admin can still pick a different system on the event.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !systems?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <ListOrdered className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No point systems yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create one, then assign it when you add an event.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {systems.map((system) => (
            <SystemEditor key={system.id} system={system} seasonId={seasonId} />
          ))}
        </div>
      )}
    </div>
  );
}

function SystemEditor({ system, seasonId }: { system: PointsSystem; seasonId: string | undefined }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => toRows(system));
  const suggestion = suggestionLabel(system.suggestedType);

  const saveMutation = useMutation({
    mutationFn: (payload: { placement: number; points: number }[]) =>
      apiFetch(`/api/points-systems/${system.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rules: payload }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-systems", seasonId] });
      toast.success(`${system.name} points saved`);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to save points"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/points-systems/${system.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-systems", seasonId] });
      toast.success("Point system deleted");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to delete point system"),
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
    <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{system.name}</CardTitle>
          {suggestion && (
            <Badge variant="outline" className="mt-2 font-normal">
              {suggestion}
            </Badge>
          )}
        </div>
        <ConfirmDeleteDialog
          title={`Delete ${system.name}?`}
          description="Events using this system must be changed first."
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
            <ListOrdered className="mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No placements yet. Add rows for 1st, 2nd, and so on.</p>
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
  );
}
