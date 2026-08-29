"use client";

import { useState } from "react";
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
import type { SportEvent, Team } from "@/lib/types";

const schema = z
  .object({
    sportEventId: z.string().min(1, "Select an event"),
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

export function ScheduleMatchDialog({
  events,
  teams,
  defaultEventId,
}: {
  events: SportEvent[];
  teams: Team[];
  defaultEventId?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sportEventId: defaultEventId ?? "", homeTeamId: "", awayTeamId: "", scheduledAt: "", venue: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => apiFetch("/api/matches", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["event", form.getValues("sportEventId")] });
      toast.success("Match scheduled");
      setOpen(false);
      form.reset({ sportEventId: defaultEventId ?? "", homeTeamId: "", awayTeamId: "", scheduledAt: "", venue: "" });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to schedule match"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" disabled={!teams.length || !events.length} />}>
        <Plus className="size-4" />
        Schedule Match
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Match</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          {!defaultEventId && (
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={form.watch("sportEventId")} onValueChange={(v) => form.setValue("sportEventId", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sportEventId && (
                <p className="text-sm text-destructive">{form.formState.errors.sportEventId.message}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Home team</Label>
              <Select value={form.watch("homeTeamId")} onValueChange={(v) => form.setValue("homeTeamId", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Away team</Label>
              <Select value={form.watch("awayTeamId")} onValueChange={(v) => form.setValue("awayTeamId", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
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
            <Label htmlFor="scheduledAt">Date &amp; time</Label>
            <Input id="scheduledAt" type="datetime-local" {...form.register("scheduledAt")} />
            {form.formState.errors.scheduledAt && (
              <p className="text-sm text-destructive">{form.formState.errors.scheduledAt.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue (optional)</Label>
            <Input id="venue" placeholder="Main Gymnasium" {...form.register("venue")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
