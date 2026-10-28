"use client";

import { use } from "react";
import useSWR from "swr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Minus, Plus, Play, Flag, MapPin, Clock, Lock, Pause, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetcher, apiFetch, ApiError } from "@/lib/api-client";
import { format, sessionSides, sessionVsLabel } from "@/lib/format";
import { MatchReasonDialog } from "@/components/dashboard/match-reason-dialog";
import type { EventSchedule } from "@/lib/types";

function TeamPanel({
  label,
  score,
  colorHex,
  disabled,
  onDelta,
}: {
  label: string;
  score: number;
  colorHex: string;
  disabled: boolean;
  onDelta: (delta: number) => void;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-6 rounded-2xl border border-border/70 bg-card/85 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10 sm:p-8"
      style={{ borderTopWidth: 4, borderTopColor: colorHex }}
    >
      <p className="text-center text-lg font-semibold tracking-tight sm:text-xl">{label}</p>
      <p className="text-7xl font-bold tabular-nums tracking-tight sm:text-8xl">{score}</p>
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="outline"
          className="size-14 rounded-full text-xl"
          disabled={disabled}
          onClick={() => onDelta(-1)}
        >
          <Minus className="size-6" />
        </Button>
        <Button size="icon" className="size-16 rounded-full text-2xl" disabled={disabled} onClick={() => onDelta(1)}>
          <Plus className="size-7" />
        </Button>
      </div>
    </div>
  );
}

type SessionAction =
  | "START"
  | "FINISH"
  | "POSTPONE"
  | "REQUEST_RESUME"
  | "APPROVE_RESUME"
  | "REJECT_RESUME"
  | "REQUEST_CONTROL"
  | "APPROVE_CONTROL"
  | "REJECT_CONTROL";

export default function SessionScoreboardPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = use(params);
  const { data: session } = useSession();
  const role = session?.user.role;
  const queryClient = useQueryClient();

  const { data: game, isLoading, mutate } = useSWR<EventSchedule>(`/api/schedules/${scheduleId}`, fetcher, {
    refreshInterval: 3000,
  });

  const scoreMutation = useMutation({
    mutationFn: (vars: { teamId: string; delta: number }) =>
      apiFetch<EventSchedule>(`/api/schedules/${scheduleId}/score`, { method: "PATCH", body: JSON.stringify(vars) }),
    onSuccess: (updated) => {
      mutate(updated, { revalidate: false });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update score"),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { action: SessionAction; reason?: string }) =>
      apiFetch<EventSchedule>(`/api/schedules/${scheduleId}/status`, { method: "PATCH", body: JSON.stringify(vars) }),
    onSuccess: (updated, vars) => {
      mutate(updated, { revalidate: false });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["event", updated.sportEventId] });
      queryClient.invalidateQueries({ queryKey: ["tabulator", "my-events"] });
      const messages: Record<string, string> = {
        START: "Session started",
        FINISH: "Session finished and locked",
        POSTPONE: "Session postponed and locked",
        REQUEST_RESUME: "Resume letter sent. Waiting for admin approval.",
        APPROVE_RESUME: "Resume approved. The tabulator can start the session.",
        REJECT_RESUME: "Resume request rejected.",
        REQUEST_CONTROL: "Control request sent. Waiting for admin approval.",
        APPROVE_CONTROL: "Control approved. The tabulator can go live.",
        REJECT_CONTROL: "Control request rejected.",
      };
      toast.success(messages[vars.action] ?? "Session updated");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update session status"),
  });

  if (isLoading || !game) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const isLive = game.status === "LIVE";
  const isFinished = game.status === "FINISHED";
  const isPostponed = game.status === "POSTPONED";
  const isLocked = isFinished || isPostponed;
  const scores = game.scores ?? [];
  const { home, away } = sessionSides(scores);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{game.sportEvent?.name}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {sessionVsLabel(game.scores, game.title || "Solo session")}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {format.dateTime(game.scheduledAt)}
            </span>
            {game.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {game.venue}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              isLive
                ? "bg-destructive/10 text-destructive"
                : isFinished
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : isPostponed
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
            }
          >
            {isLive && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-destructive" />}
            {isLocked && <Lock className="mr-1 size-3" />}
            {game.status}
          </Badge>
          {game.status === "SCHEDULED" && role === "ADMIN" && (
            <>
              {game.controlRequestedAt && !game.controlApprovedAt && (
                <>
                  <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "APPROVE_CONTROL" })}>
                    <Check className="size-4" />
                    Approve Control
                  </Button>
                  <Button variant="outline" className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "REJECT_CONTROL" })}>
                    <X className="size-4" />
                    Reject
                  </Button>
                </>
              )}
              <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "START" })}>
                <Play className="size-4" />
                Start Session
              </Button>
            </>
          )}
          {game.status === "SCHEDULED" && role === "TABULATOR" && !game.controlApprovedAt && !game.controlRequestedAt && (
            <MatchReasonDialog
              title="Request live control"
              description="Write a letter asking an admin to let you control this scoreboard and go live."
              placeholder="e.g. Both players are present and the chess boards are set. Ready to start scoring..."
              confirmLabel="Send request"
              minLength={15}
              pending={statusMutation.isPending}
              trigger={<Button className="gap-2">Request Control</Button>}
              onSubmit={(reason) => statusMutation.mutate({ action: "REQUEST_CONTROL", reason })}
            />
          )}
          {game.status === "SCHEDULED" && role === "TABULATOR" && game.controlApprovedAt && (
            <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "START" })}>
              <Play className="size-4" />
              Start Session
            </Button>
          )}
          {game.status === "SCHEDULED" && (
            <MatchReasonDialog
              title="Postpone this session"
              description="Write why this solo session needs to be postponed. The reason will appear on the public schedule."
              placeholder="e.g. Venue is unavailable until the next period..."
              confirmLabel="Send postpone"
              minLength={8}
              pending={statusMutation.isPending}
              trigger={
                <Button variant="outline" className="gap-2">
                  <Pause className="size-4" />
                  Postpone
                </Button>
              }
              onSubmit={(reason) => statusMutation.mutate({ action: "POSTPONE", reason })}
            />
          )}
          {isPostponed && role === "ADMIN" && (
            <>
              {game.resumeRequestedAt && !game.resumeApprovedAt && (
                <>
                  <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "APPROVE_RESUME" })}>
                    <Check className="size-4" />
                    Approve Resume
                  </Button>
                  <Button variant="outline" className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "REJECT_RESUME" })}>
                    <X className="size-4" />
                    Reject
                  </Button>
                </>
              )}
              <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "START" })}>
                <Play className="size-4" />
                Resume Session
              </Button>
            </>
          )}
          {isPostponed && role === "TABULATOR" && !game.resumeApprovedAt && !game.resumeRequestedAt && (
            <MatchReasonDialog
              title="Request resume"
              description="Write a letter explaining why this postponed session should resume. An admin must approve it first."
              placeholder="e.g. The venue is open and all players are ready to continue..."
              confirmLabel="Send request"
              minLength={15}
              pending={statusMutation.isPending}
              trigger={<Button className="gap-2">Request Resume</Button>}
              onSubmit={(reason) => statusMutation.mutate({ action: "REQUEST_RESUME", reason })}
            />
          )}
          {isPostponed && role === "TABULATOR" && game.resumeApprovedAt && (
            <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "START" })}>
              <Play className="size-4" />
              Resume Session
            </Button>
          )}
          {isLive && (
            <>
              <MatchReasonDialog
                title="Postpone this session"
                description="Write why this live session needs to stop. The reason will appear on the public schedule."
                placeholder="e.g. Power outage stopped the remaining rounds..."
                confirmLabel="Send postpone"
                minLength={8}
                pending={statusMutation.isPending}
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Pause className="size-4" />
                    Postpone
                  </Button>
                }
                onSubmit={(reason) => statusMutation.mutate({ action: "POSTPONE", reason })}
              />
              <Button variant="outline" className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ action: "FINISH" })}>
                <Flag className="size-4" />
                Finish Session
              </Button>
            </>
          )}
        </div>
      </div>

      {game.status === "SCHEDULED" && (
        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {game.controlRequestReason && (
            <p>
              <span className="font-medium text-foreground">Control letter: </span>
              {game.controlRequestReason}
            </p>
          )}
          <p>
            {game.controlApprovedAt
              ? `Admin approved live control${game.controlApprovedBy?.name ? ` (${game.controlApprovedBy.name})` : ""}. The tabulator can start this session.`
              : game.controlRequestedAt
                ? `Control requested${game.controlRequestedBy?.name ? ` by ${game.controlRequestedBy.name}` : ""}. Waiting for admin approval.`
                : role === "TABULATOR"
                  ? "Request admin approval before you can control this scoreboard and go live."
                  : "An admin can start this session immediately, or approve a tabulator control request."}
          </p>
        </div>
      )}
      {isFinished && (
        <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          This session is finished and locked. Scores can no longer be changed. Use Finalize Results on the event page to award placement points.
        </p>
      )}
      {isPostponed && (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-muted-foreground">
          {game.postponeReason && (
            <p>
              <span className="font-medium text-foreground">Postpone reason: </span>
              {game.postponeReason}
            </p>
          )}
          {game.resumeRequestReason && (
            <p>
              <span className="font-medium text-foreground">Resume letter: </span>
              {game.resumeRequestReason}
            </p>
          )}
          <p>
            {game.resumeApprovedAt
              ? `Admin approved the resume${game.resumeApprovedBy?.name ? ` (${game.resumeApprovedBy.name})` : ""}. The tabulator can start the session.`
              : game.resumeRequestedAt
                ? `Resume requested${game.resumeRequestedBy?.name ? ` by ${game.resumeRequestedBy.name}` : ""}. Waiting for admin approval.`
                : role === "TABULATOR"
                  ? "This session is postponed and locked. Write a resume letter for admin approval."
                  : "This session is postponed and locked. An admin can resume it, or approve a tabulator letter."}
          </p>
        </div>
      )}

      {scores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          {isLive
            ? "No teams are enrolled in this event yet, so there is nothing to score."
            : "Enrolled team scores appear here after the session goes live."}
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {home && (
            <TeamPanel
              label={home.team.name}
              score={home.score}
              colorHex={home.team.colorHex}
              disabled={!isLive || scoreMutation.isPending}
              onDelta={(delta) => scoreMutation.mutate({ teamId: home.teamId, delta })}
            />
          )}
          {away && (
            <TeamPanel
              label={away.team.name}
              score={away.score}
              colorHex={away.team.colorHex}
              disabled={!isLive || scoreMutation.isPending}
              onDelta={(delta) => scoreMutation.mutate({ teamId: away.teamId, delta })}
            />
          )}
        </div>
      )}
    </div>
  );
}
