"use client";

import { use } from "react";
import useSWR from "swr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Play, Flag, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetcher, apiFetch, ApiError } from "@/lib/api-client";
import { format } from "@/lib/format";
import type { Match } from "@/lib/types";

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
        <Button
          size="icon"
          variant="outline"
          className="size-14 rounded-full text-xl"
          disabled={disabled}
          onClick={() => onDelta(2)}
        >
          <span className="text-sm font-semibold">+2</span>
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-14 rounded-full text-xl"
          disabled={disabled}
          onClick={() => onDelta(3)}
        >
          <span className="text-sm font-semibold">+3</span>
        </Button>
      </div>
    </div>
  );
}

export default function ScoreboardControlPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const queryClient = useQueryClient();

  const { data: match, isLoading, mutate } = useSWR<Match>(`/api/matches/${matchId}`, fetcher, {
    refreshInterval: 3000,
  });

  const scoreMutation = useMutation({
    mutationFn: (vars: { team: "HOME" | "AWAY"; delta: number }) =>
      apiFetch<Match>(`/api/matches/${matchId}/score`, { method: "PATCH", body: JSON.stringify(vars) }),
    onSuccess: (updated) => {
      mutate(updated, { revalidate: false });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update score"),
  });

  const statusMutation = useMutation({
    mutationFn: (action: "START" | "FINISH") =>
      apiFetch<Match>(`/api/matches/${matchId}/status`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: (updated) => {
      mutate(updated, { revalidate: false });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["event", updated.sportEventId] });
      toast.success(updated.status === "LIVE" ? "Match started" : "Match finished");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update match status"),
  });

  if (isLoading || !match) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-80 flex-1 rounded-2xl" />
          <Skeleton className="h-80 flex-1 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {match.sportEvent?.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {format.dateTime(match.scheduledAt)}
            </span>
            {match.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {match.venue}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={isLive ? "bg-destructive/10 text-destructive" : isFinished ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}>
            {isLive && <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-destructive" />}
            {match.status}
          </Badge>
          {!isLive && !isFinished && (
            <Button className="gap-2" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate("START")}>
              <Play className="size-4" />
              Start Match
            </Button>
          )}
          {isLive && (
            <Button
              variant="outline"
              className="gap-2"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("FINISH")}
            >
              <Flag className="size-4" />
              Finish Match
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <TeamPanel
          label={match.homeTeam.name}
          score={match.homeScore}
          colorHex={match.homeTeam.colorHex}
          disabled={!isLive || scoreMutation.isPending}
          onDelta={(delta) => scoreMutation.mutate({ team: "HOME", delta })}
        />
        <TeamPanel
          label={match.awayTeam.name}
          score={match.awayScore}
          colorHex={match.awayTeam.colorHex}
          disabled={!isLive || scoreMutation.isPending}
          onDelta={(delta) => scoreMutation.mutate({ team: "AWAY", delta })}
        />
      </div>

      {isFinished && match.winnerTeam && (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {match.winnerTeam.name} won this match.
        </p>
      )}
      {isFinished && !match.winnerTeamId && (
        <p className="text-center text-sm font-medium text-muted-foreground">Match ended in a draw.</p>
      )}
    </div>
  );
}
