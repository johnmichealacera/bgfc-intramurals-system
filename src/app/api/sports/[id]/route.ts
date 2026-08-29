import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const current = await db.sport.findUniqueOrThrow({ where: { id } });
    if (current.isDefault) {
      return NextResponse.json({ error: "Default PRISAA sports can't be edited." }, { status: 409 });
    }

    if (body.name) {
      const existing = await db.sport.findFirst({
        where: { name: { equals: body.name, mode: "insensitive" }, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "A sport with this name already exists." }, { status: 409 });
      }
    }

    const sport = await db.sport.update({ where: { id }, data: body });
    return NextResponse.json(sport);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const current = await db.sport.findUniqueOrThrow({ where: { id } });
    if (current.isDefault) {
      return NextResponse.json({ error: "Default PRISAA sports can't be deleted." }, { status: 409 });
    }

    await db.sport.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
