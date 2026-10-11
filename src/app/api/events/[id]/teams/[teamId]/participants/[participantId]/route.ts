import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; teamId: string; participantId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id, teamId, participantId } = await params;
    const eventTeam = await db.eventTeam.findUniqueOrThrow({
      where: { sportEventId_teamId: { sportEventId: id, teamId } },
    });

    await db.eventParticipant.delete({
      where: {
        eventTeamId_participantId: {
          eventTeamId: eventTeam.id,
          participantId,
        },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
