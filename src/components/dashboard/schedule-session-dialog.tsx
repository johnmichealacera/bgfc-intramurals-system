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
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

const MODE_ITEMS = {
  VERSUS: "Versus (1 vs 1)",
  FIELD: "Field (2 or more teams)",
};

const schema = z
  .object({
    mode: z.enum(["VERSUS", "FIELD"]),
    title: z.string().optional(),
    homeTeamId: z.string().optional(),
    awayTeamId: z.string().optional(),
    teamIds: z.array(z.string()),
    scheduledAt: z.string().min(1, "Select a date and time"),
    venue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "VERSUS") {
      if (!data.homeTeamId) ctx.addIssue({ code: "custom", path: ["homeTeamId"], message: "Select a team" });
      if (!data.awayTeamId) ctx.addIssue({ code: "custom", path: ["awayTeamId"], message: "Select a team" });
      if (data.homeTeamId && data.awayTeamId && data.homeTeamId === data.awayTeamId) {
        ctx.addIssue({ code: "custom", path: ["awayTeamId"], message: "Home and away teams must be different" });
      }
      return;
    }
    if (data.teamIds.length < 2) {
      ctx.addIssue({ code: "custom", path: ["teamIds"], message: "Select at least two teams" });
    }
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  mode: "VERSUS",
  title: "",
  homeTeamId: "",
  awayTeamId: "",
  teamIds: [],
  scheduledAt: "",
  venue: "",
};

export function ScheduleSessionDialog({ eventId, teams }: { eventId: string; teams: Team[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const mode = form.watch("mode");
  const homeTeamId = form.watch("homeTeamId");
  const awayTeamId = form.watch("awayTeamId");
  const teamIds = form.watch("teamIds");
  const teamItems = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams]);
  const homeTeamOptions = teams.filter((t) => t.id !== awayTeamId);
  const awayTeamOptions = teams.filter((t) => t.id !== homeTeamId);
  const allTeamIds = useMemo(() => teams.map((t) => t.id), [teams]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch(`/api/events/${eventId}/schedules`, {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          scheduledAt: values.scheduledAt,
          venue: values.venue,
          teamIds: values.mode === "VERSUS" ? [values.homeTeamId, values.awayTeamId] : values.teamIds,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Game scheduled");
      setOpen(false);
      form.reset(EMPTY);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to schedule game"),
  });

  function setMode(next: FormValues["mode"]) {
    form.setValue("mode", next);
    if (next === "FIELD" && teamIds.length === 0) {
      form.setValue("teamIds", allTeamIds);
    }
  }

  function toggleTeam(teamId: string) {
    form.setValue(
      "teamIds",
      teamIds.includes(teamId) ? teamIds.filter((id) => id !== teamId) : [...teamIds, teamId],
    );
  }

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
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={mode} onValueChange={(value) => setMode((value as FormValues["mode"]) ?? "VERSUS")} items={MODE_ITEMS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VERSUS">{MODE_ITEMS.VERSUS}</SelectItem>
                <SelectItem value="FIELD">{MODE_ITEMS.FIELD}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "VERSUS" ? (
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
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Teams in this session</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => form.setValue("teamIds", allTeamIds)}>
                    Select all
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => form.setValue("teamIds", [])}>
                    Clear
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this for pageants, literary, and other events where several teams compete together.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
                {teams.map((team) => {
                  const selected = teamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeam(team.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        selected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: team.colorHex }}
                      />
                      <span className="min-w-0 flex-1 truncate">{team.name}</span>
                      <span className="text-[10px] uppercase tracking-wider">{selected ? "In" : "Out"}</span>
                    </button>
                  );
                })}
              </div>
              {form.formState.errors.teamIds && (
                <p className="text-sm text-destructive">{form.formState.errors.teamIds.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" placeholder={mode === "FIELD" ? "Pageant finals" : "Finals"} {...form.register("title")} />
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
