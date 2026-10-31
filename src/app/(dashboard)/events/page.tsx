"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trophy, Swords, ListOrdered } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useSelectedSeason } from "@/hooks/use-selected-season";
import { eventCategoryLabel, eventTypeLabel, suggestedPointsSystemId } from "@/lib/format";
import type { PointsSystem, Sport, SportEvent, SportEventCategory, SportEventStatus } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]),
  category: z.enum(["MEN", "WOMEN", "MIXED", "UNSPECIFIED"]),
  description: z.string().optional(),
  pointsSystemId: z.string().min(1, "Select a point system"),
});
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  name: "",
  type: "TEAM_VS_TEAM",
  category: "UNSPECIFIED",
  description: "",
  pointsSystemId: "",
};

const EVENT_TYPE_ITEMS = {
  TEAM_VS_TEAM: "Group (e.g. basketball, volleyball)",
  PLACEMENT: "Solo (e.g. chess, dancesport)",
};

const CATEGORY_ITEMS = {
  UNSPECIFIED: "Not specified",
  MEN: "Men",
  WOMEN: "Women",
  MIXED: "Mixed",
};

const statusStyles: Record<SportEventStatus, string> = {
  UPCOMING: "bg-muted text-muted-foreground",
  ONGOING: "bg-primary/15 text-primary",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportEvent | null>(null);
  const { seasons, seasonItems, seasonId, setSeasonId } = useSelectedSeason();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", seasonId],
    queryFn: () => apiFetch<SportEvent[]>(`/api/events?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const { data: sports } = useQuery({
    queryKey: ["sports"],
    queryFn: () => apiFetch<Sport[]>("/api/sports"),
  });

  const { data: pointsSystems } = useQuery({
    queryKey: ["points-systems", seasonId],
    queryFn: () => apiFetch<PointsSystem[]>(`/api/points-systems?seasonId=${seasonId}`),
    enabled: !!seasonId,
  });

  const eventType = form.watch("type");

  useEffect(() => {
    if (editingEvent || !pointsSystems?.length) return;
    form.setValue("pointsSystemId", suggestedPointsSystemId(pointsSystems, eventType));
  }, [eventType, pointsSystems, editingEvent, form]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<SportEvent>("/api/events", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          seasonId,
          category: values.category === "UNSPECIFIED" ? undefined : values.category,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", seasonId] });
      toast.success("Event created");
      setOpen(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to create event"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
      category,
      description,
      pointsSystemId,
    }: {
      id: string;
      name: string;
      category: FormValues["category"];
      description?: string;
      pointsSystemId: string;
    }) =>
      apiFetch<SportEvent>(`/api/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          category: category === "UNSPECIFIED" ? null : category,
          description,
          pointsSystemId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", seasonId] });
      toast.success("Event updated");
      setOpen(false);
      setEditingEvent(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update event"),
  });

  function openCreateDialog() {
    setEditingEvent(null);
    form.reset({
      ...DEFAULT_VALUES,
      pointsSystemId: suggestedPointsSystemId(pointsSystems ?? [], "TEAM_VS_TEAM"),
    });
    setOpen(true);
  }

  function openEditDialog(event: SportEvent) {
    setEditingEvent(event);
    form.reset({
      name: event.name,
      type: event.type,
      category: event.category ?? "UNSPECIFIED",
      description: event.description ?? "",
      pointsSystemId: event.pointsSystemId ?? event.pointsSystem?.id ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(values: FormValues) {
    if (editingEvent) {
      updateMutation.mutate({
        id: editingEvent.id,
        name: values.name,
        category: values.category,
        description: values.description,
        pointsSystemId: values.pointsSystemId,
      });
    } else {
      createMutation.mutate(values);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Manage season events by division (Men's, Women's, Mixed). Each player can enter at most 3 events and cannot cross Men's and Women's categories."
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
                if (!next) setEditingEvent(null);
              }}
            >
              <DialogTrigger render={<Button className="gap-2" disabled={!seasonId} onClick={openCreateDialog} />}>
                <Plus className="size-4" />
                New Event
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  {!editingEvent && !!sports?.length && (
                    <div className="space-y-2">
                      <Label>Quick add a sport</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {sports.map((sport) => (
                          <button
                            key={sport.id}
                            type="button"
                            onClick={() => {
                              form.setValue("name", sport.name);
                              form.setValue("type", sport.type);
                              form.setValue("pointsSystemId", suggestedPointsSystemId(pointsSystems ?? [], sport.type));
                            }}
                            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            {sport.name}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Don&apos;t see a sport you need? Add it from the{" "}
                        <Link href="/sports" className="text-primary hover:underline">
                          Sports page
                        </Link>
                        .
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Event name</Label>
                    <Input id="name" placeholder="Men's Basketball" {...form.register("name")} />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.watch("type")}
                      onValueChange={(v) => form.setValue("type", v as FormValues["type"])}
                      disabled={!!editingEvent}
                      items={EVENT_TYPE_ITEMS}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEAM_VS_TEAM">Group (e.g. basketball, volleyball)</SelectItem>
                        <SelectItem value="PLACEMENT">Solo (e.g. chess, dancesport)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Type only changes how the event is run. Points are chosen separately below.
                    </p>
                    {editingEvent && (
                      <p className="text-xs text-muted-foreground">Type can&apos;t be changed after an event is created.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Point system</Label>
                    <Select
                      value={form.watch("pointsSystemId")}
                      onValueChange={(v) => form.setValue("pointsSystemId", v ?? "")}
                      items={Object.fromEntries((pointsSystems ?? []).map((system) => [system.id, system.name]))}
                      disabled={!pointsSystems?.length}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a point system" />
                      </SelectTrigger>
                      <SelectContent>
                        {(pointsSystems ?? []).map((system) => (
                          <SelectItem key={system.id} value={system.id}>
                            {system.name}
                            {system.suggestedType === "TEAM_VS_TEAM"
                              ? " (group default)"
                              : system.suggestedType === "PLACEMENT"
                                ? " (solo default)"
                                : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Group and solo are suggested from the event type. Pick another system for literary, pageant, or a custom table.
                    </p>
                    {form.formState.errors.pointsSystemId && (
                      <p className="text-sm text-destructive">{form.formState.errors.pointsSystemId.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={form.watch("category")}
                      onValueChange={(v) => form.setValue("category", v as FormValues["category"])}
                      items={CATEGORY_ITEMS}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNSPECIFIED">Not specified</SelectItem>
                        <SelectItem value="MEN">Men</SelectItem>
                        <SelectItem value="WOMEN">Women</SelectItem>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea id="description" rows={3} {...form.register("description")} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : editingEvent ? "Save Changes" : "Create"}
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
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : !events?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Trophy className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No events yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {seasonId ? "Create your first event for this season." : "Activate a season to begin adding events."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["MEN", "WOMEN", "MIXED", "OTHER"] as const).map((group) => {
            const grouped = events.filter((event) => (event.category ?? "OTHER") === group);
            if (!grouped.length) return null;
            const heading: Record<SportEventCategory | "OTHER", string> = {
              MEN: "Men's Division",
              WOMEN: "Women's Division",
              MIXED: "Mixed Division",
              OTHER: "Open / Unspecified",
            };
            return (
              <section key={group} className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight">{heading[group]}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="block">
                      <Card className="h-full border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10">
                        <CardContent className="flex h-full flex-col gap-3 p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {event.type === "TEAM_VS_TEAM" ? <Swords className="size-4" /> : <ListOrdered className="size-4" />}
                              <span className="text-xs font-medium uppercase tracking-wider">
                                {eventTypeLabel(event.type)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge className={statusStyles[event.status]}>{event.status}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEditDialog(event);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold tracking-tight">{event.name}</p>
                            {event.category && (
                              <Badge variant="outline" className="text-[10px]">
                                {eventCategoryLabel(event.category)}
                              </Badge>
                            )}
                          </div>
                          {event._count && (
                            <p className="mt-auto text-xs text-muted-foreground">
                              {event.type === "TEAM_VS_TEAM"
                                ? `${event._count.matches} match${event._count.matches === 1 ? "" : "es"}`
                                : `${event._count.placements} result${event._count.placements === 1 ? "" : "s"}`}
                              {event.pointsSystem ? ` · ${event.pointsSystem.name} points` : ""}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
