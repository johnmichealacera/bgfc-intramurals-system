"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Dumbbell, Swords, ListOrdered, Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import type { Sport } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]),
});
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { name: "", type: "TEAM_VS_TEAM" };

const TYPE_ITEMS = {
  TEAM_VS_TEAM: "Team vs. Team (e.g. basketball, volleyball)",
  PLACEMENT: "Placement (e.g. dance, track and field)",
};

export default function SportsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const { data: sports, isLoading } = useQuery({
    queryKey: ["sports"],
    queryFn: () => apiFetch<Sport[]>("/api/sports"),
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => apiFetch<Sport>("/api/sports", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sports"] });
      toast.success("Sport added");
      setOpen(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to add sport"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: FormValues & { id: string }) =>
      apiFetch<Sport>(`/api/sports/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sports"] });
      toast.success("Sport updated");
      setOpen(false);
      setEditingSport(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update sport"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sports/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sports"] });
      toast.success("Sport removed");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to remove sport"),
  });

  function openCreateDialog() {
    setEditingSport(null);
    form.reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEditDialog(sport: Sport) {
    setEditingSport(sport);
    form.reset({ name: sport.name, type: sport.type });
    setOpen(true);
  }

  function handleSubmit(values: FormValues) {
    if (editingSport) {
      updateMutation.mutate({ id: editingSport.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sports"
        description="The sports offered for events. Add your own alongside the default PRISAA sports — they'll show up as quick picks when creating an event."
        actions={
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEditingSport(null);
            }}
          >
            <DialogTrigger render={<Button className="gap-2" onClick={openCreateDialog} />}>
              <Plus className="size-4" />
              New Sport
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSport ? "Edit Sport" : "Add Sport"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sport name</Label>
                  <Input id="name" placeholder="Esports" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(v) => form.setValue("type", v as FormValues["type"])}
                    items={TYPE_ITEMS}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEAM_VS_TEAM">Team vs. Team (e.g. basketball, volleyball)</SelectItem>
                      <SelectItem value="PLACEMENT">Placement (e.g. dance, track and field)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingSport ? "Save Changes" : "Add Sport"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !sports?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Dumbbell className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No sports yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <Card
              key={sport.id}
              className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10"
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  {sport.type === "TEAM_VS_TEAM" ? (
                    <Swords className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ListOrdered className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{sport.name}</p>
                    {sport.isDefault && (
                      <Badge variant="outline" className="mt-1 gap-1 text-[10px]">
                        <Lock className="size-2.5" />
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                {!sport.isDefault && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(sport)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmDeleteDialog
                      title={`Remove ${sport.name}?`}
                      description="This only removes it from the quick-pick list — it won't affect any events already created."
                      pending={deleteMutation.isPending}
                      onConfirm={() => deleteMutation.mutate(sport.id)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
