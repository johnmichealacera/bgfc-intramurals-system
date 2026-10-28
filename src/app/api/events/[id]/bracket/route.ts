import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { bracketGameInclude, generateEventBracket, rankTeamsByRoundRobin } from "@/lib/bracket";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id } = await params;
    const games = await db.eventBracketGame.findMany({
      where: { sportEventId: id },
      include: bracketGameInclude,
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });
    return NextResponse.json(games);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const event = await db.sportEvent.findUniqueOrThrow({
      where: { id },
      include: {
        eventTeams: { orderBy: { team: { name: "asc" } } },
        matches: {
          where: { phase: "ROUND_ROBIN" },
          select: {
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            winnerTeamId: true,
            status: true,
            phase: true,
          },
        },
      },
    });
    if (event.type !== "TEAM_VS_TEAM") {
      return NextResponse.json(
        { error: "Elimination brackets are generated for group events. Solo events show a finals field instead." },
        { status: 400 },
      );
    }
    if (event.matches.length === 0) {
      return NextResponse.json(
        { error: "Generate pairings first. The elimination bracket is seeded from round-robin wins." },
        { status: 409 },
      );
    }
    if (!event.matches.some((match) => match.status === "FINISHED")) {
      return NextResponse.json(
        { error: "Finish at least one round-robin match so the bracket can be seeded by wins." },
        { status: 409 },
      );
    }

    const seededIds = rankTeamsByRoundRobin(
      event.eventTeams.map((entry) => entry.teamId),
      event.matches,
    );

    const games = await db.$transaction(
      (tx) => generateEventBracket(tx, id, seededIds),
      { timeout: 20000 },
    );
    return NextResponse.json(games, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
