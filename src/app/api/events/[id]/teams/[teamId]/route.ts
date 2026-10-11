import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id, teamId } = await params;

    const [matchCount, placementCount] = await Promise.all([
      db.match.count({
        where: {
          sportEventId: id,
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        },
      }),
      db.eventPlacement.count({ where: { sportEventId: id, teamId } }),
    ]);

    if (matchCount > 0 || placementCount > 0) {
      return NextResponse.json(
        { error: "Cannot unenroll a team that already has matches or results in this event." },
        { status: 409 },
      );
    }

    await db.eventTeam.delete({
      where: { sportEventId_teamId: { sportEventId: id, teamId } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
