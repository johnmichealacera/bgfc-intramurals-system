import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const updateSchema = z.object({
  teamId: z.string().nullable().optional(),
  fullName: z.string().min(1).optional(),
  course: z.string().min(1).optional(),
  yearLevel: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE"]).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const fullName = body.fullName?.trim();

    if (fullName) {
      const current = await db.participant.findUniqueOrThrow({
        where: { id },
        select: { seasonId: true },
      });
      const duplicate = await db.participant.findFirst({
        where: {
          seasonId: current.seasonId,
          id: { not: id },
          fullName: { equals: fullName, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A participant with this full name already exists in this season." },
          { status: 409 },
        );
      }
    }

    const participant = await db.participant.update({
      where: { id },
      data: { ...body, ...(fullName ? { fullName } : {}) },
      include: { team: { select: { id: true, name: true, colorHex: true } } },
    });
    return NextResponse.json(participant);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    await db.participant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
