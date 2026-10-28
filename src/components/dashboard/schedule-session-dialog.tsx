"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Team } from "@/lib/types";

const schema = z
  .object({
    title: z.string().optional(),
    homeTeamId: z.string().min(1, "Select a team"),
    awayTeamId: z.string().min(1, "Select a team"),
    scheduledAt: z.string().min(1, "Select a date and time"),
    venue: z.string().optional(),
  })
  .refine((data) => data.homeTeamId !== data.awayTeamId, {
    message: "Home and away teams must be different",
    path: ["awayTeamId"],
  });
type FormValues = z.infer<typeof schema>;

export function ScheduleSessionDialog({ eventId, teams }: { eventId: string; teams: Team[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", homeTeamId: "", awayTeamId: "", scheduledAt: "", venue: "" },
  });

  const homeTeamId = form.watch("homeTeamId");
  const awayTeamId = form.watch("awayTeamId");
  const teamItems = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams]);
  const homeTeamOptions = teams.filter((t) => t.id !== awayTeamId);
  const awayTeamOptions = teams.filter((t) => t.id !== homeTeamId);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch(`/api/events/${eventId}/schedules`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Game scheduled");
      setOpen(false);
      form.reset({ title: "", homeTeamId: "", awayTeamId: "", scheduledAt: "", venue: "" });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to schedule game"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" disabled={teams.length < 2} />}>
        <Plus className="size-4" />
        Schedule Game
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Solo Game</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          {teams.length < 2 && (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Enroll at least two teams in this event before scheduling a game.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Home team</Label>
              <Select
                value={homeTeamId}
                onValueChange={(v) => form.setValue("homeTeamId", v ?? "")}
                items={teamItems}
                disabled={teams.length < 2}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {homeTeamOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.homeTeamId && (
                <p className="text-sm text-destructive">{form.formState.errors.homeTeamId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Away team</Label>
              <Select
                value={awayTeamId}
                onValueChange={(v) => form.setValue("awayTeamId", v ?? "")}
                items={teamItems}
                disabled={teams.length < 2}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {awayTeamOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.awayTeamId && (
                <p className="text-sm text-destructive">{form.formState.errors.awayTeamId.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" placeholder="Finals" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Date &amp; time</Label>
            <Input id="scheduledAt" type="datetime-local" {...form.register("scheduledAt")} />
            {form.formState.errors.scheduledAt && (
              <p className="text-sm text-destructive">{form.formState.errors.scheduledAt.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue (optional)</Label>
            <Input id="venue" placeholder="Multi-Purpose Hall" {...form.register("venue")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending || teams.length < 2}>
              {createMutation.isPending ? "Saving..." : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
