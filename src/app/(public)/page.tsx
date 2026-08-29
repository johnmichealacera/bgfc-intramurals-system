"use client";

import Link from "next/link";
import useSWR from "swr";
import { Trophy, Radio, ListOrdered, CalendarDays, BookOpen, ArrowUpRight } from "lucide-react";
import { fetcher } from "@/lib/api-client";
import type { Match, Season } from "@/lib/types";

export default function PublicHomePage() {
  const { data: season } = useSWR<Season | null>("/api/public/seasons/active", fetcher);
  const { data: liveMatches } = useSWR<Match[]>("/api/public/live-matches", fetcher, { refreshInterval: 5000 });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <p className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Trophy className="size-3.5 text-primary" />
          {season?.name ?? "No active season"}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Bucas Grande Foundation College{" "}
          <span className="bg-linear-to-r from-primary to-teal-600 bg-clip-text text-transparent">Intramurals</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Follow live scores and overall standings as they happen — no login required.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/live"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:shadow-lg"
          >
            <Radio className="size-4" />
            Watch Live
          </Link>
          <Link
            href="/standings"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-primary/25 bg-background/80 px-5 text-sm font-medium shadow-sm transition-all hover:bg-primary/5"
          >
            <ListOrdered className="size-4" />
            View Standings
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/live"
          className="rounded-xl border border-border/70 bg-card/85 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10"
        >
          <Radio className="size-5 text-destructive" />
          <p className="mt-3 font-semibold tracking-tight">{liveMatches?.length ?? 0} Live Now</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            See what&apos;s happening <ArrowUpRight className="size-3" />
          </p>
        </Link>
        <Link
          href="/standings"
          className="rounded-xl border border-border/70 bg-card/85 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10"
        >
          <ListOrdered className="size-5 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-3 font-semibold tracking-tight">Overall Standings</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            See the team rankings <ArrowUpRight className="size-3" />
          </p>
        </Link>
        <Link
          href="/schedule"
          className="rounded-xl border border-border/70 bg-card/85 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10"
        >
          <CalendarDays className="size-5 text-teal-600 dark:text-teal-400" />
          <p className="mt-3 font-semibold tracking-tight">Events & Schedule</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            Browse all events <ArrowUpRight className="size-3" />
          </p>
        </Link>
        <Link
          href="/rules"
          className="rounded-xl border border-border/70 bg-card/85 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:ring-white/10"
        >
          <BookOpen className="size-5 text-primary" />
          <p className="mt-3 font-semibold tracking-tight">Sports Guidelines</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            See the official rules <ArrowUpRight className="size-3" />
          </p>
        </Link>
      </section>
    </div>
  );
}
