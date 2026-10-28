import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { bracketGameInclude, generateEventBracket } from "@/lib/bracket";

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
      include: { eventTeams: { orderBy: { team: { name: "asc" } } } },
    });
    if (event.type !== "TEAM_VS_TEAM") {
      return NextResponse.json(
        { error: "Elimination brackets are generated for group events. Solo events show a finals field instead." },
        { status: 400 },
      );
    }

    const games = await db.$transaction(
      (tx) =>
        generateEventBracket(
          tx,
          id,
          event.eventTeams.map((entry) => entry.teamId),
        ),
      { timeout: 20000 },
    );
    return NextResponse.json(games, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
