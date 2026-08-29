"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, UserPlus, X, Trophy } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScheduleMatchDialog } from "@/components/dashboard/schedule-match-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { format } from "@/lib/format";
import type { AppUser, SportEventDetail, Team } from "@/lib/types";

const matchStatusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => apiFetch<SportEventDetail>(`/api/events/${id}`),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams", event?.seasonId],
    queryFn: () => apiFetch<Team[]>(`/api/teams?seasonId=${event!.seasonId}`),
    enabled: !!event,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<AppUser[]>("/api/users"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "ONGOING" | "CANCELLED") =>
      apiFetch(`/api/events/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Event status updated");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update status"),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/events/${id}/tabulators`, { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Tabulator assigned");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to assign tabulator"),
  });

  const unassignMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/events/${id}/tabulators/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Tabulator unassigned");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to unassign tabulator"),
  });

  const [placementDrafts, setPlacementDrafts] = useState<Record<string, string>>({});

  const placementsByTeam = useMemo(() => {
    const map = new Map<string, number>();
    event?.placements.forEach((p) => map.set(p.teamId, p.placement));
    return map;
  }, [event]);

  const finalizeMutation = useMutation({
    mutationFn: (placements: { teamId: string; placement: number }[]) =>
      apiFetch<{ warnings: string[] }>(`/api/events/${id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ placements }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Results finalized");
      data.warnings.forEach((w) => toast.warning(w));
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to finalize results"),
  });

  if (isLoading || !event) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const unresolvedMatches = event.matches.filter((m) => m.status !== "FINISHED").length;
  const canFinalize = event.type === "PLACEMENT" || unresolvedMatches === 0;
  const assignedUserIds = new Set(event.tabulators.map((t) => t.userId));
  const availableTabulators = (users ?? []).filter((u) => u.role === "TABULATOR" && !assignedUserIds.has(u.id));

  function handleFinalize() {
    const placements = Object.entries(placementDrafts)
      .filter(([, value]) => value.trim() !== "")
      .map(([teamId, value]) => ({ teamId, placement: Number(value) }));
    if (!placements.length) {
      toast.error("Enter at least one placement");
      return;
    }
    finalizeMutation.mutate(placements);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.name}
        description={event.season.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{event.type === "TEAM_VS_TEAM" ? "Team vs. Team" : "Placement"}</Badge>
            <Badge>{event.status}</Badge>
            {event.status === "UPCOMING" && (
              <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("ONGOING")}>
                Start Event
              </Button>
            )}
            {event.status === "ONGOING" && (
              <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("CANCELLED")}>
                Cancel Event
              </Button>
            )}
          </div>
        }
      />

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardHeader>
          <CardTitle className="text-base">Assigned Tabulators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {event.tabulators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tabulators assigned. The admin can still score matches.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {event.tabulators.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-2 py-1.5 pl-3">
                  {t.user.name}
                  <button
                    onClick={() => unassignMutation.mutate(t.userId)}
                    className="rounded-full p-0.5 hover:bg-background/60"
                    aria-label={`Unassign ${t.user.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {availableTabulators.length > 0 && (
            <Select
              onValueChange={(value) => typeof value === "string" && assignMutation.mutate(value)}
              items={Object.fromEntries(availableTabulators.map((u) => [u.id, `${u.name} (${u.email})`]))}
            >
              <SelectTrigger className="w-64">
                <UserPlus className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Assign a tabulator" />
              </SelectTrigger>
              <SelectContent>
                {availableTabulators.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {event.type === "TEAM_VS_TEAM" && (
        <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Matches</CardTitle>
            <ScheduleMatchDialog events={[event]} teams={teams ?? []} defaultEventId={event.id} />
          </CardHeader>
          <CardContent className="p-0">
            {event.matches.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No matches scheduled yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matchup</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.matches.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.homeTeam.name} vs {m.awayTeam.name}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {m.homeScore} – {m.awayScore}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format.dateTime(m.scheduledAt)}</TableCell>
                      <TableCell>
                        <Badge className={matchStatusStyles[m.status]}>{m.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.status !== "FINISHED" && (
                          <Button
                            render={<Link href={`/scoreboard/${m.id}`} />}
                            nativeButton={false}
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                          >
                            <Radio className="size-3.5" />
                            Control
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardHeader>
          <CardTitle className="text-base">
            {event.placements.length > 0 ? "Results" : "Finalize Results"}
          </CardTitle>
          {!canFinalize && (
            <p className="text-xs text-muted-foreground">
              All matches must be finished before results can be finalized ({unresolvedMatches} remaining).
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {(teams ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams in this season yet.</p>
          ) : (
            <div className="space-y-2">
              {teams!.map((team) => (
                <div key={team.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 p-2.5">
                  <span className="size-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: team.colorHex }} />
                  <p className="flex-1 text-sm font-medium">{team.name}</p>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Placement"
                    className="w-28"
                    disabled={!canFinalize}
                    defaultValue={placementsByTeam.get(team.id)?.toString() ?? ""}
                    onChange={(e) => setPlacementDrafts((prev) => ({ ...prev, [team.id]: e.target.value }))}
                  />
                </div>
              ))}
              <Button disabled={!canFinalize || finalizeMutation.isPending} onClick={handleFinalize} className="gap-2">
                <Trophy className="size-4" />
                {finalizeMutation.isPending ? "Finalizing..." : "Finalize Results"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
