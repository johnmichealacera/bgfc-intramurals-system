"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Radio, Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { format } from "@/lib/format";
import type { Match, SportEvent } from "@/lib/types";

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  LIVE: "bg-destructive/10 text-destructive",
  FINISHED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POSTPONED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default function ScoreboardListPage() {
  const { data: session } = useSession();
  const role = session?.user.role;

  const { data: tabulatorEvents, isLoading: loadingTabulator } = useQuery({
    queryKey: ["tabulator", "my-events"],
    queryFn: () => apiFetch<(SportEvent & { matches: Match[] })[]>("/api/tabulator/my-events"),
    enabled: role === "TABULATOR",
  });

  const { data: adminMatches, isLoading: loadingAdmin } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: () => apiFetch<Match[]>("/api/matches"),
    enabled: role === "ADMIN",
  });

  const isLoading = role === "TABULATOR" ? loadingTabulator : loadingAdmin;
  const matches =
    role === "TABULATOR"
      ? (tabulatorEvents ?? []).flatMap((e) => e.matches.map((m) => ({ ...m, sportEvent: e })))
      : (adminMatches ?? []);

  const active = matches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
  const postponed = matches.filter((m) => m.status === "POSTPONED");
  const finished = matches.filter((m) => m.status === "FINISHED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scoreboard"
        description="Score live matches only. Postponed and finished games stay visible but locked."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !matches.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-12 text-center">
          <Radio className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No matches yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "TABULATOR" ? "You have no assigned events with matches." : "Schedule a match to get started."}
          </p>
        </div>
      ) : (
        <>
          <MatchSection title="Active" empty="No live or upcoming matches right now." matches={active} />
          <MatchSection
            title="Postponed"
            hint="These games are locked until they are resumed."
            empty="No postponed matches."
            matches={postponed}
          />
          <MatchSection
            title="Finished"
            hint="Finished scores are locked and cannot be changed."
            matches={finished}
          />
        </>
      )}
    </div>
  );
}

function MatchSection({
  title,
  hint,
  empty,
  matches,
}: {
  title: string;
  hint?: string;
  empty?: string;
  matches: Match[];
}) {
  if (!matches.length && !empty) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {!matches.length ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </section>
  );
}

function MatchCard({ match: m }: { match: Match }) {
  const locked = m.status === "FINISHED" || m.status === "POSTPONED";
  return (
    <Link href={`/scoreboard/${m.id}`}>
      <Card className="h-full border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10">
        <CardContent className="flex h-full flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {m.sportEvent?.name}
            </span>
            <Badge className={statusStyles[m.status] ?? ""}>
              {locked && <Lock className="mr-1 size-3" />}
              {m.status}
            </Badge>
          </div>
          <p className="font-semibold tracking-tight">
            {m.homeTeam.name} vs {m.awayTeam.name}
          </p>
          {m.status === "FINISHED" || m.status === "LIVE" ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {m.homeScore} – {m.awayScore}
            </p>
          ) : null}
          <p className="mt-auto text-xs text-muted-foreground">{format.dateTime(m.scheduledAt)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
