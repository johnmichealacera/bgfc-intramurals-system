import type { Prisma } from "@/generated/prisma/client";

export function nextPowerOfTwo(n: number) {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildRoundRobinPairings(teamIds: string[]) {
  const pairs: { homeTeamId: string; awayTeamId: string }[] = [];
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      pairs.push(
        Math.random() < 0.5
          ? { homeTeamId: teamIds[i], awayTeamId: teamIds[j] }
          : { homeTeamId: teamIds[j], awayTeamId: teamIds[i] },
      );
    }
  }
  return shuffled(pairs);
}

export function pairKey(homeTeamId: string, awayTeamId: string) {
  return [homeTeamId, awayTeamId].sort().join(":");
}

export type RoundRobinStat = { teamId: string; wins: number; losses: number; diff: number; scored: number };

export function roundRobinStandings(
  teamIds: string[],
  matches: {
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    winnerTeamId: string | null;
    status: string;
    phase?: string;
  }[],
): RoundRobinStat[] {
  const stats = new Map(teamIds.map((id) => [id, { teamId: id, wins: 0, losses: 0, diff: 0, scored: 0 }]));
  for (const match of matches) {
    if (match.phase === "ELIMINATION" || match.status !== "FINISHED") continue;
    const home = stats.get(match.homeTeamId);
    const away = stats.get(match.awayTeamId);
    if (!home || !away) continue;
    home.scored += match.homeScore;
    away.scored += match.awayScore;
    home.diff += match.homeScore - match.awayScore;
    away.diff += match.awayScore - match.homeScore;
    if (match.winnerTeamId === match.homeTeamId) {
      home.wins += 1;
      away.losses += 1;
    } else if (match.winnerTeamId === match.awayTeamId) {
      away.wins += 1;
      home.losses += 1;
    }
  }
  return [...stats.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.scored !== a.scored) return b.scored - a.scored;
    return a.teamId.localeCompare(b.teamId);
  });
}

export function rankTeamsByRoundRobin(
  teamIds: string[],
  matches: Parameters<typeof roundRobinStandings>[1],
) {
  return roundRobinStandings(teamIds, matches).map((row) => row.teamId);
}

export function classicPairings(teamIds: string[]) {
  const size = nextPowerOfTwo(Math.max(teamIds.length, 2));
  const slots: (string | null)[] = Array.from({ length: size }, () => null);
  teamIds.forEach((id, index) => {
    slots[index] = id;
  });

  const pairings: { homeTeamId: string | null; awayTeamId: string | null }[] = [];
  for (let i = 0; i < size / 2; i += 1) {
    pairings.push({ homeTeamId: slots[i], awayTeamId: slots[size - 1 - i] });
  }
  return { size, pairings, totalRounds: Math.log2(size) };
}

export function bracketRoundLabel(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}

type Tx = Prisma.TransactionClient;

type GameDraft = {
  id: string;
  sportEventId: string;
  round: number;
  position: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  winnerTeamId: string | null;
  matchId: string | null;
  nextGameId: string | null;
  nextSlot: "HOME" | "AWAY" | null;
};

function findPairingMatch(
  matches: { id: string; homeTeamId: string; awayTeamId: string; winnerTeamId: string | null }[],
  homeTeamId: string | null,
  awayTeamId: string | null,
) {
  if (!homeTeamId || !awayTeamId) return undefined;
  return matches.find(
    (item) =>
      (item.homeTeamId === homeTeamId && item.awayTeamId === awayTeamId) ||
      (item.homeTeamId === awayTeamId && item.awayTeamId === homeTeamId),
  );
}

export const bracketGameInclude = {
  homeTeam: true,
  awayTeam: true,
  winnerTeam: true,
  match: { include: { homeTeam: true, awayTeam: true, winnerTeam: true } },
} as const;

export async function generateEventBracket(tx: Tx, sportEventId: string, teamIds: string[]) {
  if (teamIds.length < 2) {
    throw new Error("Enroll at least two teams before generating a bracket.");
  }

  const { pairings, totalRounds } = classicPairings(teamIds);
  const existingMatches = await tx.match.findMany({
    where: { sportEventId, phase: "ELIMINATION" },
  });

  const drafts: GameDraft[] = [];
  for (let round = 1; round <= totalRounds; round += 1) {
    const count = pairings.length / 2 ** (round - 1);
    for (let position = 0; position < count; position += 1) {
      drafts.push({
        id: crypto.randomUUID(),
        sportEventId,
        round,
        position,
        homeTeamId: null,
        awayTeamId: null,
        winnerTeamId: null,
        matchId: null,
        nextGameId: null,
        nextSlot: null,
      });
    }
  }

  const byRound = (round: number, position: number) =>
    drafts.find((game) => game.round === round && game.position === position);

  for (const game of drafts) {
    if (game.round === totalRounds) continue;
    const next = byRound(game.round + 1, Math.floor(game.position / 2));
    if (!next) continue;
    game.nextGameId = next.id;
    game.nextSlot = game.position % 2 === 0 ? "HOME" : "AWAY";
  }

  const knownMatches = existingMatches.map((item) => ({
    id: item.id,
    homeTeamId: item.homeTeamId,
    awayTeamId: item.awayTeamId,
    winnerTeamId: item.winnerTeamId,
  }));
  const matchesToCreate: {
    id: string;
    sportEventId: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
    status: "SCHEDULED";
    phase: "ELIMINATION";
  }[] = [];

  function attachMatch(game: GameDraft) {
    if (!game.homeTeamId || !game.awayTeamId || game.matchId) return;
    const existing = findPairingMatch(knownMatches, game.homeTeamId, game.awayTeamId);
    if (existing) {
      game.matchId = existing.id;
      if (!game.winnerTeamId && existing.winnerTeamId) game.winnerTeamId = existing.winnerTeamId;
      return;
    }
    const id = crypto.randomUUID();
    matchesToCreate.push({
      id,
      sportEventId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      scheduledAt: new Date(),
      status: "SCHEDULED",
      phase: "ELIMINATION",
    });
    knownMatches.push({
      id,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      winnerTeamId: null,
    });
    game.matchId = id;
  }

  function propagate(game: GameDraft) {
    if (!game.winnerTeamId || !game.nextGameId || !game.nextSlot) return;
    const next = drafts.find((item) => item.id === game.nextGameId);
    if (!next) return;
    if (game.nextSlot === "HOME") next.homeTeamId = game.winnerTeamId;
    else next.awayTeamId = game.winnerTeamId;
    attachMatch(next);
    if (next.winnerTeamId) propagate(next);
  }

  for (const [position, pairing] of pairings.entries()) {
    const first = byRound(1, position);
    if (!first) continue;
    first.homeTeamId = pairing.homeTeamId;
    first.awayTeamId = pairing.awayTeamId;
    first.winnerTeamId =
      pairing.homeTeamId && !pairing.awayTeamId
        ? pairing.homeTeamId
        : !pairing.homeTeamId && pairing.awayTeamId
          ? pairing.awayTeamId
          : null;
    attachMatch(first);
    if (first.winnerTeamId) propagate(first);
  }

  await tx.eventBracketGame.deleteMany({ where: { sportEventId } });
  if (matchesToCreate.length > 0) {
    await tx.match.createMany({ data: matchesToCreate });
  }
  await tx.eventBracketGame.createMany({
    data: [...drafts].sort((a, b) => b.round - a.round),
  });

  return tx.eventBracketGame.findMany({
    where: { sportEventId },
    include: bracketGameInclude,
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
}

export async function advanceBracketWinner(tx: Tx, matchId: string, winnerTeamId: string | null) {
  const game = await tx.eventBracketGame.findUnique({ where: { matchId } });
  if (!game) return;

  await tx.eventBracketGame.update({ where: { id: game.id }, data: { winnerTeamId } });
  if (!winnerTeamId || !game.nextGameId || !game.nextSlot) return;

  const next = await tx.eventBracketGame.update({
    where: { id: game.nextGameId },
    data: game.nextSlot === "HOME" ? { homeTeamId: winnerTeamId } : { awayTeamId: winnerTeamId },
  });

  if (next.homeTeamId && next.awayTeamId && !next.matchId) {
    const match = await tx.match.create({
      data: {
        sportEventId: next.sportEventId,
        homeTeamId: next.homeTeamId,
        awayTeamId: next.awayTeamId,
        scheduledAt: new Date(),
        status: "SCHEDULED",
        phase: "ELIMINATION",
      },
    });
    await tx.eventBracketGame.update({ where: { id: next.id }, data: { matchId: match.id } });
  }
}
