"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, UserPlus, X, Trophy, BookOpen, ShieldPlus, Users, CalendarDays, Search, Lock, GitBranch, Shuffle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ScheduleMatchDialog } from "@/components/dashboard/schedule-match-dialog";
import { ScheduleSessionDialog } from "@/components/dashboard/schedule-session-dialog";
import { ConfirmDeleteDialog } from "@/components/dashboard/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { format, eventCategoryLabel, eventTypeLabel, sessionVsLabel } from "@/lib/format";
import { findGuidelineForEventName } from "@/lib/sports-guidelines";
import { getEnrollmentBlockReason, MAX_EVENT_ENTRIES } from "@/lib/enrollment-rules";
import { EventBracket } from "@/components/event-bracket";
import { roundRobinStandings } from "@/lib/bracket";
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
  const [rosterQuery, setRosterQuery] = useState("");

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
      queryClient.invalidateQueries({ queryKey: ["participants"] });
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

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      apiFetch(`/api/events/${id}/schedules/${scheduleId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Session removed");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to remove session"),
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

  const generatePairingsMutation = useMutation({
    mutationFn: () => apiFetch(`/api/events/${id}/pairings`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Round-robin pairings generated");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to generate pairings"),
  });

  const generateBracketMutation = useMutation({
    mutationFn: () => apiFetch(`/api/events/${id}/bracket`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Elimination bracket generated from round-robin standings");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to generate bracket"),
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
  const tabulators = event.tabulators ?? [];
  const assignedUserIds = new Set(tabulators.map((t) => t.userId));
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
        description={event.season?.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{eventTypeLabel(event.type)}</Badge>
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
          {tabulators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tabulators assigned. The admin can still score matches.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tabulators.map((t) => (
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
              Enroll teams, then add players by name. Each player can enter at most {MAX_EVENT_ENTRIES} events,
              and cannot cross Men&apos;s and Women&apos;s divisions.
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
                      onClick={() => {
                        setExpandedTeamId(expanded ? null : et.teamId);
                        setRosterQuery("");
                      }}
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

                      {teamParticipants.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          This team has no participants yet. Add them under Teams.
                        </p>
                      ) : availableParticipants.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          All of this team’s participants are already on the event roster.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative max-w-md">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={rosterQuery}
                              onChange={(e) => setRosterQuery(e.target.value)}
                              placeholder="Type a player name to add..."
                              className="pl-8"
                            />
                          </div>
                          <ul className="max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-background/70">
                            {availableParticipants
                              .filter((p) => p.fullName.toLowerCase().includes(rosterQuery.trim().toLowerCase()))
                              .map((p) => {
                                const blockReason = getEnrollmentBlockReason(p, event);
                                return (
                                  <li key={p.id} className="border-b border-border/50 last:border-b-0">
                                    <button
                                      type="button"
                                      disabled={!!blockReason || addRosterMutation.isPending}
                                      onClick={() => addRosterMutation.mutate({ teamId: et.teamId, participantId: p.id })}
                                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <span>
                                        <span className="font-medium">{p.fullName}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          {(p.eventEntries?.length ?? 0)}/{MAX_EVENT_ENTRIES} events
                                        </span>
                                      </span>
                                      {blockReason ? (
                                        <span className="max-w-64 text-right text-xs text-destructive">{blockReason}</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                                          <UserPlus className="size-3" />
                                          Add
                                        </span>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            {availableParticipants.filter((p) =>
                              p.fullName.toLowerCase().includes(rosterQuery.trim().toLowerCase()),
                            ).length === 0 && (
                              <li className="px-3 py-2 text-xs text-muted-foreground">No matching names.</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Elimination Bracket</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {event.type === "TEAM_VS_TEAM"
                ? "Seeded from round-robin wins, then point difference. Best record gets the easiest path to quarters, semis, and the final."
                : "Public finals field for this solo event. Rankings appear after finalize."}
            </p>
          </div>
          {event.type === "TEAM_VS_TEAM" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={generateBracketMutation.isPending || event.eventTeams.length < 2}
              onClick={() => generateBracketMutation.mutate()}
            >
              <GitBranch className="size-3.5" />
              {generateBracketMutation.isPending ? "Generating..." : "Generate Bracket"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <EventBracket
            games={event.bracketGames ?? []}
            placements={event.placements}
            fieldTeams={event.type === "PLACEMENT" ? event.eventTeams.map((et) => et.team) : undefined}
          />
        </CardContent>
      </Card>

      {event.type === "PLACEMENT" && (
        <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Solo Games</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Schedule a versus game between two enrolled teams. Tabulators request admin approval before
                they can control the scoreboard.
              </p>
            </div>
            <ScheduleSessionDialog eventId={event.id} teams={enrolledTeams} />
          </CardHeader>
          <CardContent className="p-0">
            {(event.schedules ?? []).length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No sessions scheduled yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matchup</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="size-3.5 text-muted-foreground" />
                          {sessionVsLabel(s.scores, s.title || "Session")}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format.dateTime(s.scheduledAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{s.venue || "—"}</TableCell>
                      <TableCell>
                        <Badge className={matchStatusStyles[s.status] ?? matchStatusStyles.SCHEDULED}>{s.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            render={<Link href={`/scoreboard/session/${s.id}`} />}
                            nativeButton={false}
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                          >
                            {s.status === "FINISHED" || s.status === "POSTPONED" ? (
                              <Lock className="size-3.5" />
                            ) : (
                              <Radio className="size-3.5" />
                            )}
                            {s.status === "FINISHED" ? "View" : s.status === "POSTPONED" ? "Locked" : "Control"}
                          </Button>
                          {s.status === "SCHEDULED" && (
                            <ConfirmDeleteDialog
                              title="Remove this session?"
                              description="It will no longer appear on the public schedule."
                              pending={deleteScheduleMutation.isPending}
                              onConfirm={() => deleteScheduleMutation.mutate(s.id)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {event.type === "TEAM_VS_TEAM" && (
        <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Matches</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate pairings so every enrolled team plays every other team. Home and away are random.
                After those games have results, generate the elimination bracket from the standings.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={generatePairingsMutation.isPending || event.eventTeams.length < 2}
                onClick={() => generatePairingsMutation.mutate()}
              >
                <Shuffle className="size-3.5" />
                {generatePairingsMutation.isPending ? "Pairing..." : "Generate pairings"}
              </Button>
              <ScheduleMatchDialog events={[event]} teams={enrolledTeams} defaultEventId={event.id} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {event.matches.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No matches scheduled yet.</p>
            ) : (
              <>
                {event.eventTeams.length > 0 && (
                  <div className="border-b border-border/60 px-6 py-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Round-robin standings
                    </p>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {roundRobinStandings(
                        event.eventTeams.map((entry) => entry.teamId),
                        event.matches,
                      ).map((row, index) => {
                        const team = event.eventTeams.find((entry) => entry.teamId === row.teamId)?.team;
                        if (!team) return null;
                        return (
                          <li key={row.teamId} className="flex items-center gap-2 text-sm">
                            <span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.colorHex }} />
                            <span className="min-w-0 flex-1 truncate font-medium">{team.name}</span>
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {row.wins}–{row.losses}
                              {row.diff !== 0 ? ` · ${row.diff > 0 ? "+" : ""}${row.diff}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
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
                          <p className="flex flex-wrap items-center gap-2">
                            {m.homeTeam.name} vs {m.awayTeam.name}
                            <Badge variant="outline" className="font-normal">
                              {(m.phase ?? "ROUND_ROBIN") === "ELIMINATION" ? "Elimination" : "Round robin"}
                            </Badge>
                          </p>
                          {m.status === "POSTPONED" && m.postponeReason && (
                            <p className="mt-1 text-xs font-normal text-amber-700 dark:text-amber-400">
                              Reason: {m.postponeReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {m.homeScore} – {m.awayScore}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{format.dateTime(m.scheduledAt)}</TableCell>
                        <TableCell>
                          <Badge className={matchStatusStyles[m.status]}>{m.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            render={<Link href={`/scoreboard/${m.id}`} />}
                            nativeButton={false}
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                          >
                            {m.status === "FINISHED" || m.status === "POSTPONED" ? (
                              <Lock className="size-3.5" />
                            ) : (
                              <Radio className="size-3.5" />
                            )}
                            {m.status === "FINISHED" ? "View" : m.status === "POSTPONED" ? "Locked" : "Control"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
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
