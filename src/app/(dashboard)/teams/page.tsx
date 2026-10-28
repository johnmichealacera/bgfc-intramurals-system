"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Shield, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Team } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #0f766e"),
});
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { name: "", colorHex: "#0f766e" };

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", seasonId],
    queryFn: () => apiFetch<Team[]>(`/api/teams?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<Team>("/api/teams", { method: "POST", body: JSON.stringify({ ...values, seasonId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", seasonId] });
      toast.success("Team created");
      setOpen(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to create team"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: FormValues & { id: string }) =>
      apiFetch<Team>(`/api/teams/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", seasonId] });
      toast.success("Team updated");
      setOpen(false);
      setEditingTeam(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update team"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", seasonId] });
      toast.success("Team deleted");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to delete team"),
  });

  function openCreateDialog() {
    setEditingTeam(null);
    form.reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEditDialog(team: Team) {
    setEditingTeam(team);
    form.reset({ name: team.name, colorHex: team.colorHex });
    setOpen(true);
  }

  function handleSubmit(values: FormValues) {
    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const colorHex = form.watch("colorHex");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Manage the teams competing in the selected season."
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
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) setEditingTeam(null);
              }}
            >
              <DialogTrigger render={<Button className="gap-2" disabled={!seasonId} onClick={openCreateDialog} />}>
                <Plus className="size-4" />
                New Team
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTeam ? "Edit Team" : "Create Team"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Team name</Label>
                    <Input id="name" placeholder="Team Falcons" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorHex">Team color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 cursor-pointer rounded-md border border-input"
                        value={colorHex}
                        onChange={(e) =>
                          form.setValue("colorHex", e.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      <Input id="colorHex" className="flex-1" {...form.register("colorHex")} />
                    </div>
                    {form.formState.errors.colorHex && (
                      <p className="text-sm text-destructive">{form.formState.errors.colorHex.message}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : editingTeam ? "Save Changes" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !teams?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Shield className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No teams yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {seasonId ? "Add a team to get started." : "Activate a season to begin adding teams."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="block">
              <Card className="h-full border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className="size-6 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: team.colorHex }} />
                    <div>
                      <p className="font-medium">{team.name}</p>
                      {team._count && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {team._count.participants} participant{team._count.participants === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(team)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmDeleteDialog
                      title={`Delete ${team.name}?`}
                      description="This can only be done if the team has no matches or results recorded."
                      pending={deleteMutation.isPending}
                      onConfirm={() => deleteMutation.mutate(team.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
