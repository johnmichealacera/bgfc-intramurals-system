import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const season = await db.season.update({ where: { id }, data: body });
    return NextResponse.json(season);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const [teamCount, eventCount] = await Promise.all([
      db.team.count({ where: { seasonId: id } }),
      db.sportEvent.count({ where: { seasonId: id } }),
    ]);
    if (teamCount > 0 || eventCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a season that already has teams or events." },
        { status: 409 },
      );
    }

    await db.season.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
