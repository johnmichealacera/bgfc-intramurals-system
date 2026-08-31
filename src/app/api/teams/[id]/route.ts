import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id } = await params;
    const team = await db.team.findUniqueOrThrow({
      where: { id },
      include: { season: true, participants: { orderBy: { fullName: "asc" } } },
    });
    return NextResponse.json(team);
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
    const team = await db.team.update({ where: { id }, data: body });
    return NextResponse.json(team);
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
      db.match.count({ where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] } }),
      db.eventPlacement.count({ where: { teamId: id } }),
    ]);
    if (matchCount > 0 || placementCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a team that already has matches or results." },
        { status: 409 },
      );
    }

    await db.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
