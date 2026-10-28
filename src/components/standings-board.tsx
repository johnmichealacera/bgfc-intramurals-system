import { ListOrdered, Medal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { computeTiedRanks, medalKey, sortByMedals } from "@/lib/medals";
import type { StandingRow } from "@/lib/types";

const rankTone: Record<number, string> = {
  1: "bg-amber-400/20 text-amber-700 ring-1 ring-amber-400/40 dark:text-amber-300",
  2: "bg-slate-400/20 text-slate-600 ring-1 ring-slate-400/40 dark:text-slate-300",
  3: "bg-orange-700/15 text-orange-800 ring-1 ring-orange-700/30 dark:text-orange-300",
};

const medalTone = {
  gold: "text-amber-600 dark:text-amber-400",
  silver: "text-slate-500 dark:text-slate-300",
  bronze: "text-orange-700 dark:text-orange-400",
};

const podiumMeta = [
  { rank: 1, label: "Champion", medal: "Gold", className: "from-amber-400/20 to-amber-400/0 ring-amber-400/30" },
  { rank: 2, label: "2nd Place", medal: "Silver", className: "from-slate-400/20 to-slate-400/0 ring-slate-400/30" },
  { rank: 3, label: "3rd Place", medal: "Bronze", className: "from-orange-700/15 to-orange-700/0 ring-orange-700/25" },
] as const;

export function StandingsBoard({
  rows,
  sort = "points",
  emptyLabel = "No teams yet",
  emptyHint = "Add teams for this season to start the standings.",
  embedded = false,
}: {
  rows: StandingRow[];
  sort?: "points" | "medals";
  emptyLabel?: string;
  emptyHint?: string;
  embedded?: boolean;
}) {
  const list = sort === "medals" ? sortByMedals(rows) : rows;
  const ranks = computeTiedRanks(list, sort === "medals" ? medalKey : (row) => row.totalPoints);

  if (!list.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-16 text-center">
        <ListOrdered className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{emptyLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden",
        !embedded &&
          "rounded-2xl border border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className={cn("text-right", medalTone.gold)}>Gold</TableHead>
            <TableHead className={cn("text-right", medalTone.silver)}>Silver</TableHead>
            <TableHead className={cn("text-right", medalTone.bronze)}>Bronze</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((row, idx) => {
            const rank = ranks[idx];
            return (
              <TableRow key={row.team.id}>
                <TableCell>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-sm font-semibold",
                      rankTone[rank] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {rank}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: row.team.colorHex }}
                    />
                    <span className="font-medium">{row.team.name}</span>
                  </span>
                </TableCell>
                <TableCell className={cn("text-right tabular-nums font-semibold", medalTone.gold)}>
                  {row.gold ?? 0}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums font-semibold", medalTone.silver)}>
                  {row.silver ?? 0}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums font-semibold", medalTone.bronze)}>
                  {row.bronze ?? 0}
                </TableCell>
                <TableCell className="text-right text-lg font-semibold tabular-nums">{row.totalPoints}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function MedalPodium({ rows }: { rows: StandingRow[] }) {
  const ranked = sortByMedals(rows);
  const ranks = computeTiedRanks(ranked, medalKey);
  const slots = podiumMeta.map((meta) => ({
    ...meta,
    teams: ranked.filter((_, idx) => ranks[idx] === meta.rank),
  }));

  if (slots.every((slot) => slot.teams.length === 0 || slot.teams.every((t) => t.gold + t.silver + t.bronze === 0))) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {slots.map((slot) => (
        <div
          key={slot.rank}
          className={cn(
            "rounded-2xl border border-border/70 bg-linear-to-br p-4 shadow-lg ring-1 backdrop-blur-sm dark:ring-white/10",
            slot.className,
          )}
        >
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Medal className="size-3.5" />
            {slot.label}
          </p>
          {slot.teams.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {slot.teams.map((row) => (
                <li key={row.team.id} className="flex items-center gap-2">
                  <span
                    className="size-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: row.team.colorHex }}
                  />
                  <span className="truncate font-semibold tracking-tight">{row.team.name}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{slot.medal}</p>
        </div>
      ))}
    </div>
  );
}
