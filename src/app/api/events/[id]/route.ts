import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["MEN", "WOMEN", "MIXED"]).nullable().optional(),
  description: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id } = await params;
    const event = await db.sportEvent.findUniqueOrThrow({
      where: { id },
      include: {
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            winnerTeam: true,
            resumeRequestedBy: { select: { id: true, name: true } },
            resumeApprovedBy: { select: { id: true, name: true } },
            controlRequestedBy: { select: { id: true, name: true } },
            controlApprovedBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
        bracketGames: {
          include: {
            homeTeam: true,
            awayTeam: true,
            winnerTeam: true,
            match: { include: { homeTeam: true, awayTeam: true, winnerTeam: true } },
          },
          orderBy: [{ round: "asc" }, { position: "asc" }],
        },
        schedules: {
          include: {
            scores: { include: { team: true }, orderBy: { createdAt: "asc" } },
            resumeRequestedBy: { select: { id: true, name: true } },
            resumeApprovedBy: { select: { id: true, name: true } },
            controlRequestedBy: { select: { id: true, name: true } },
            controlApprovedBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
        placements: { include: { team: true }, orderBy: { placement: "asc" } },
        eventTeams: {
          include: {
            team: true,
            participants: {
              include: { participant: true },
              orderBy: { participant: { fullName: "asc" } },
            },
          },
          orderBy: { team: { name: "asc" } },
        },
        tabulators: { include: { user: { select: { id: true, name: true, email: true } } } },
        season: true,
      },
    });
    return NextResponse.json(event);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const event = await db.sportEvent.update({ where: { id }, data: body });
    return NextResponse.json(event);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const [matchCount, placementCount] = await Promise.all([
      db.match.count({ where: { sportEventId: id } }),
      db.eventPlacement.count({ where: { sportEventId: id } }),
    ]);
    if (matchCount > 0 || placementCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete an event that already has matches or results." },
        { status: 409 },
      );
    }

    await db.sportEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
