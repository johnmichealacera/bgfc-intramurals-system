import type { StandingRow } from "@/lib/types";

export type MedalKind = "gold" | "silver" | "bronze";

export const emptyMedals = { gold: 0, silver: 0, bronze: 0 };

export function medalFromPlacement(placement: number): MedalKind | null {
  if (placement === 1) return "gold";
  if (placement === 2) return "silver";
  if (placement === 3) return "bronze";
  return null;
}

export function medalKey(row: Pick<StandingRow, MedalKind>) {
  return `${row.gold}-${row.silver}-${row.bronze}`;
}

export function compareMedalTally(a: Pick<StandingRow, MedalKind>, b: Pick<StandingRow, MedalKind>) {
  return b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze;
}

export function sortByMedals(rows: StandingRow[]) {
  return [...rows].sort((a, b) => compareMedalTally(a, b) || a.team.name.localeCompare(b.team.name));
}

export function computeTiedRanks<T>(rows: T[], valueOf: (row: T) => string | number): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    ranks.push(i === 0 || valueOf(rows[i]) !== valueOf(rows[i - 1]) ? i + 1 : ranks[i - 1]);
  }
  return ranks;
}
