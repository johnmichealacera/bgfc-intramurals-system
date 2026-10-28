import type { StandingRow } from "@/lib/types";

export type MedalKind = "gold" | "silver" | "bronze";

export function medalKey(row: Pick<StandingRow, MedalKind>) {
  return `${row.gold}-${row.silver}-${row.bronze}`;
}

export function compareMedalTally(a: Pick<StandingRow, MedalKind>, b: Pick<StandingRow, MedalKind>) {
  return b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze;
}

export function sortByMedals(rows: StandingRow[]) {
  return [...rows].sort((a, b) => compareMedalTally(a, b) || b.totalPoints - a.totalPoints || a.team.name.localeCompare(b.team.name));
}

export function assignSeasonMedals<T extends { totalPoints: number }>(rows: T[]) {
  const ranks = computeTiedRanks(rows, (row) => row.totalPoints);
  return rows.map((row, i) => ({
    ...row,
    gold: ranks[i] === 1 && row.totalPoints > 0 ? 1 : 0,
    silver: ranks[i] === 2 && row.totalPoints > 0 ? 1 : 0,
    bronze: ranks[i] === 3 && row.totalPoints > 0 ? 1 : 0,
  }));
}

export function computeTiedRanks<T>(rows: T[], valueOf: (row: T) => string | number): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    ranks.push(i === 0 || valueOf(rows[i]) !== valueOf(rows[i - 1]) ? i + 1 : ranks[i - 1]);
  }
  return ranks;
}
