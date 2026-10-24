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

  await tx.eventBracketGame.deleteMany({ where: { sportEventId } });

  const { pairings, totalRounds } = classicPairings(teamIds);
  const existingMatches = await tx.match.findMany({ where: { sportEventId } });

  const created: { id: string; round: number; position: number }[] = [];
  for (let round = 1; round <= totalRounds; round += 1) {
    const count = pairings.length / 2 ** (round - 1);
    for (let position = 0; position < count; position += 1) {
      const game = await tx.eventBracketGame.create({
        data: { sportEventId, round, position },
      });
      created.push({ id: game.id, round, position });
    }
  }

  const byRound = (round: number, position: number) =>
    created.find((game) => game.round === round && game.position === position);

  for (const game of created) {
    if (game.round === totalRounds) continue;
    const next = byRound(game.round + 1, Math.floor(game.position / 2));
    if (!next) continue;
    await tx.eventBracketGame.update({
      where: { id: game.id },
      data: { nextGameId: next.id, nextSlot: game.position % 2 === 0 ? "HOME" : "AWAY" },
    });
  }

  for (const [position, pairing] of pairings.entries()) {
    const first = byRound(1, position);
    if (!first) continue;
    const match = existingMatches.find(
      (item) =>
        pairing.homeTeamId &&
        pairing.awayTeamId &&
        ((item.homeTeamId === pairing.homeTeamId && item.awayTeamId === pairing.awayTeamId) ||
          (item.homeTeamId === pairing.awayTeamId && item.awayTeamId === pairing.homeTeamId)),
    );

    let matchId = match?.id ?? null;
    if (!matchId && pairing.homeTeamId && pairing.awayTeamId) {
      const createdMatch = await tx.match.create({
        data: {
          sportEventId,
          homeTeamId: pairing.homeTeamId,
          awayTeamId: pairing.awayTeamId,
          scheduledAt: new Date(),
          status: "SCHEDULED",
        },
      });
      matchId = createdMatch.id;
    }

    const winnerTeamId =
      pairing.homeTeamId && !pairing.awayTeamId
        ? pairing.homeTeamId
        : !pairing.homeTeamId && pairing.awayTeamId
          ? pairing.awayTeamId
          : (match?.winnerTeamId ?? null);

    await tx.eventBracketGame.update({
      where: { id: first.id },
      data: {
        homeTeamId: pairing.homeTeamId,
        awayTeamId: pairing.awayTeamId,
        matchId,
        winnerTeamId,
      },
    });

    if (winnerTeamId && matchId) {
      await advanceBracketWinner(tx, matchId, winnerTeamId);
    } else if (winnerTeamId) {
      const game = await tx.eventBracketGame.findUniqueOrThrow({ where: { id: first.id } });
      if (game.nextGameId && game.nextSlot) {
        await tx.eventBracketGame.update({
          where: { id: game.nextGameId },
          data: game.nextSlot === "HOME" ? { homeTeamId: winnerTeamId } : { awayTeamId: winnerTeamId },
        });
      }
    }
  }

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
