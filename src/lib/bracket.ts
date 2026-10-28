import type { Prisma } from "@/generated/prisma/client";

export function nextPowerOfTwo(n: number) {
  let size = 2;
  while (size < n) size *= 2;
  return size;
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
  const existingMatches = await tx.match.findMany({ where: { sportEventId } });

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
      },
    });
    await tx.eventBracketGame.update({ where: { id: next.id }, data: { matchId: match.id } });
  }
}
