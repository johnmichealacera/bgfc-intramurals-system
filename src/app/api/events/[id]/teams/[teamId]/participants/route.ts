import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { getEnrollmentBlockReason } from "@/lib/enrollment-rules";

const addSchema = z.object({
  participantId: z.string().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id, teamId } = await params;
    const eventTeam = await db.eventTeam.findUniqueOrThrow({
      where: { sportEventId_teamId: { sportEventId: id, teamId } },
      include: {
        participants: {
          include: { participant: true },
          orderBy: { participant: { fullName: "asc" } },
        },
      },
    });
    return NextResponse.json(eventTeam.participants);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id, teamId } = await params;
    const { participantId } = addSchema.parse(await req.json());

    const eventTeam = await db.eventTeam.findUniqueOrThrow({
      where: { sportEventId_teamId: { sportEventId: id, teamId } },
      include: { sportEvent: true },
    });

    const participant = await db.participant.findUniqueOrThrow({
      where: { id: participantId },
      include: {
        eventEntries: {
          include: {
            eventTeam: {
              include: {
                sportEvent: { select: { id: true, name: true, type: true, category: true, status: true } },
              },
            },
          },
        },
      },
    });
    if (participant.teamId !== teamId) {
      return NextResponse.json({ error: "Participant must belong to the enrolled team." }, { status: 400 });
    }
    if (participant.seasonId !== eventTeam.sportEvent.seasonId) {
      return NextResponse.json({ error: "Participant must belong to the same season as the event." }, { status: 400 });
    }

    const blockReason = getEnrollmentBlockReason(participant, eventTeam.sportEvent);
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 });
    }

    const entry = await db.eventParticipant.create({
      data: { eventTeamId: eventTeam.id, participantId },
      include: { participant: true },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
