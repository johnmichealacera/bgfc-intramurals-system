import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  venue: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const { id } = await params;
    const match = await db.match.findUniqueOrThrow({
      where: { id },
      include: { homeTeam: true, awayTeam: true, winnerTeam: true, sportEvent: true },
    });
    return NextResponse.json(match);
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

    const current = await db.match.findUniqueOrThrow({ where: { id } });
    if (current.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only scheduled matches can be edited." }, { status: 409 });
    }

    const match = await db.match.update({ where: { id }, data: body });
    return NextResponse.json(match);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const current = await db.match.findUniqueOrThrow({ where: { id } });
    if (current.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only scheduled matches can be deleted." }, { status: 409 });
    }

    await db.match.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
