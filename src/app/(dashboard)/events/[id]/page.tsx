"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, UserPlus, X, Trophy, BookOpen, ShieldPlus, Users } from "lucide-react";
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
import { format, eventCategoryLabel } from "@/lib/format";
import { findGuidelineForEventName } from "@/lib/sports-guidelines";
import type { AppUser, Participant, SportEventDetail, Team } from "@/lib/types";

const matchStatusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => apiFetch<SportEventDetail>(`/api/events/${id}`),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams", event?.seasonId],
    queryFn: () => apiFetch<Team[]>(`/api/teams?seasonId=${event!.seasonId}`),
    enabled: !!event,
  });

  const { data: seasonParticipants } = useQuery({
    queryKey: ["participants", event?.seasonId],
    queryFn: () => apiFetch<Participant[]>(`/api/participants?seasonId=${event!.seasonId}`),
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

  const enrollMutation = useMutation({
    mutationFn: (teamId: string) =>
      apiFetch(`/api/events/${id}/teams`, { method: "POST", body: JSON.stringify({ teamId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["event-teams", id] });
      toast.success("Team enrolled");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to enroll team"),
  });

  const unenrollMutation = useMutation({
    mutationFn: (teamId: string) => apiFetch(`/api/events/${id}/teams/${teamId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["event-teams", id] });
      toast.success("Team unenrolled");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to unenroll team"),
  });

  const addRosterMutation = useMutation({
    mutationFn: ({ teamId, participantId }: { teamId: string; participantId: string }) =>
      apiFetch(`/api/events/${id}/teams/${teamId}/participants`, {
        method: "POST",
        body: JSON.stringify({ participantId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Participant added to event roster");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to add participant"),
  });

  const removeRosterMutation = useMutation({
    mutationFn: ({ teamId, participantId }: { teamId: string; participantId: string }) =>
      apiFetch(`/api/events/${id}/teams/${teamId}/participants/${participantId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Participant removed from event roster");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to remove participant"),
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
  const guideline = findGuidelineForEventName(event.name);
  const enrolledTeamIds = new Set(event.eventTeams.map((et) => et.teamId));
  const availableTeams = (teams ?? []).filter((t) => !enrolledTeamIds.has(t.id));
  const enrolledTeams = event.eventTeams.map((et) => et.team);

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
            {event.category && <Badge variant="outline">{eventCategoryLabel(event.category)}</Badge>}
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

      {guideline && (
        <Link
          href={`/guidelines#${guideline.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <BookOpen className="size-3.5" />
          View official {guideline.name} guidelines
        </Link>
      )}

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

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Entered Teams</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Enroll teams in this event, then pick which participants compete on each roster.
            </p>
          </div>
          {availableTeams.length > 0 && (
            <Select
              onValueChange={(value) => typeof value === "string" && enrollMutation.mutate(value)}
              items={Object.fromEntries(availableTeams.map((t) => [t.id, t.name]))}
            >
              <SelectTrigger className="w-56">
                <ShieldPlus className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Enroll a team" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {event.eventTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-10 text-center">
              <Users className="mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No teams enrolled yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enroll season teams to build this event&apos;s entrants and rosters.
              </p>
            </div>
          ) : (
            event.eventTeams.map((et) => {
              const teamParticipants = (seasonParticipants ?? []).filter((p) => p.teamId === et.teamId);
              const rosterIds = new Set(et.participants.map((p) => p.participantId));
              const availableParticipants = teamParticipants.filter((p) => !rosterIds.has(p.id));
              const expanded = expandedTeamId === et.teamId;

              return (
                <div key={et.id} className="rounded-xl border border-border/60 bg-background/60">
                  <div className="flex items-center gap-3 p-3">
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: et.team.colorHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{et.team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {et.participants.length} on event roster
                        {teamParticipants.length ? ` · ${teamParticipants.length} on team` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedTeamId(expanded ? null : et.teamId)}
                    >
                      {expanded ? "Hide roster" : "Manage roster"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => unenrollMutation.mutate(et.teamId)}
                      disabled={unenrollMutation.isPending}
                    >
                      Unenroll
                    </Button>
                  </div>

                  {expanded && (
                    <div className="space-y-3 border-t border-border/50 p-3">
                      {et.participants.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No participants on this event roster yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {et.participants.map((entry) => (
                            <Badge key={entry.id} variant="secondary" className="gap-2 py-1.5 pl-3">
                              {entry.participant.fullName}
                              <button
                                onClick={() =>
                                  removeRosterMutation.mutate({
                                    teamId: et.teamId,
                                    participantId: entry.participantId,
                                  })
                                }
                                className="rounded-full p-0.5 hover:bg-background/60"
                                aria-label={`Remove ${entry.participant.fullName}`}
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {availableParticipants.length > 0 ? (
                        <Select
                          onValueChange={(value) =>
                            typeof value === "string" &&
                            addRosterMutation.mutate({ teamId: et.teamId, participantId: value })
                          }
                          items={Object.fromEntries(availableParticipants.map((p) => [p.id, p.fullName]))}
                        >
                          <SelectTrigger className="w-72">
                            <UserPlus className="size-4 text-muted-foreground" />
                            <SelectValue placeholder="Add participant to roster" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableParticipants.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {teamParticipants.length === 0
                            ? "This team has no participants yet. Add them under Teams."
                            : "All of this team’s participants are already on the event roster."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {event.type === "TEAM_VS_TEAM" && (
        <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Matches</CardTitle>
            <ScheduleMatchDialog events={[event]} teams={enrolledTeams} defaultEventId={event.id} />
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
          {event.eventTeams.length === 0 && (
            <p className="text-xs text-muted-foreground">Enroll teams in this event before finalizing results.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {event.eventTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrolled teams to rank yet.</p>
          ) : (
            <div className="space-y-2">
              {event.eventTeams.map((et) => (
                <div
                  key={et.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 p-2.5"
                >
                  <span
                    className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: et.team.colorHex }}
                  />
                  <p className="flex-1 text-sm font-medium">{et.team.name}</p>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Placement"
                    className="w-28"
                    disabled={!canFinalize}
                    defaultValue={placementsByTeam.get(et.teamId)?.toString() ?? ""}
                    onChange={(e) => setPlacementDrafts((prev) => ({ ...prev, [et.teamId]: e.target.value }))}
                  />
                </div>
              ))}
              <Button
                disabled={!canFinalize || finalizeMutation.isPending || event.eventTeams.length === 0}
                onClick={handleFinalize}
                className="gap-2"
              >
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
