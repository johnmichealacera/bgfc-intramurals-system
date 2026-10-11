import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const enrollSchema = z.object({
  teamId: z.string().min(1),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id } = await params;
    const eventTeams = await db.eventTeam.findMany({
      where: { sportEventId: id },
      include: {
        team: true,
        participants: {
          include: { participant: true },
          orderBy: { participant: { fullName: "asc" } },
        },
      },
      orderBy: { team: { name: "asc" } },
    });
    return NextResponse.json(eventTeams);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const { teamId } = enrollSchema.parse(await req.json());

    const event = await db.sportEvent.findUniqueOrThrow({ where: { id } });
    const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
    if (team.seasonId !== event.seasonId) {
      return NextResponse.json({ error: "Team must belong to the same season as the event." }, { status: 400 });
    }

    const eventTeam = await db.eventTeam.create({
      data: { sportEventId: id, teamId },
      include: {
        team: true,
        participants: { include: { participant: true } },
      },
    });
    return NextResponse.json(eventTeam, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
