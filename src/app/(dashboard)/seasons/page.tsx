"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, CalendarDays, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { format } from "@/lib/format";

type Season = {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});
type FormValues = z.infer<typeof schema>;

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function SeasonsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { data: seasons, isLoading } = useQuery({
    queryKey: ["seasons"],
    queryFn: () => apiFetch<Season[]>("/api/seasons"),
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => apiFetch<Season>("/api/seasons", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      toast.success("Season created");
      setOpen(false);
      form.reset();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to create season"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: FormValues & { id: string }) =>
      apiFetch<Season>(`/api/seasons/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      toast.success("Season updated");
      setOpen(false);
      setEditingSeason(null);
      form.reset();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update season"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => apiFetch<Season>(`/api/seasons/${id}/activate`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      toast.success("Season activated");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to activate season"),
  });

  function openCreateDialog() {
    setEditingSeason(null);
    form.reset({ name: "", startDate: "", endDate: "" });
    setOpen(true);
  }

  function openEditDialog(season: Season) {
    setEditingSeason(season);
    form.reset({
      name: season.name,
      startDate: toDateInputValue(season.startDate),
      endDate: toDateInputValue(season.endDate),
    });
    setOpen(true);
  }

  function handleSubmit(values: FormValues) {
    if (editingSeason) {
      updateMutation.mutate({ id: editingSeason.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seasons"
        description="Manage intramural seasons. Only one season can be active at a time."
        actions={
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEditingSeason(null);
            }}
          >
            <DialogTrigger render={<Button className="gap-2" onClick={openCreateDialog} />}>
              <Plus className="size-4" />
              New Season
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSeason ? "Edit Season" : "Create Season"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Intramurals 2027" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input id="startDate" type="date" {...form.register("startDate")} />
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End date</Label>
                    <Input id="endDate" type="date" {...form.register("endDate")} />
                    {form.formState.errors.endDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingSeason ? "Save Changes" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : !seasons?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <CalendarDays className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No seasons yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first season to start adding teams and events.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <Card
              key={season.id}
              className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold tracking-tight">{season.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format.date(season.startDate)} – {format.date(season.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {season.isActive && (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Active
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(season)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {!season.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    disabled={activateMutation.isPending}
                    onClick={() => activateMutation.mutate(season.id)}
                  >
                    Set as active
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
