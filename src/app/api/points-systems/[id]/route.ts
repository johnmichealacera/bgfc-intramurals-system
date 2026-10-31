import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { pointsSystemInclude } from "@/lib/points-systems";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  suggestedType: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]).nullable().optional(),
  rules: z
    .array(
      z.object({
        placement: z.number().int().min(1),
        points: z.number().int().min(0),
      }),
    )
    .min(1)
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    if (body.rules) {
      const placementNumbers = body.rules.map((row) => row.placement);
      if (new Set(placementNumbers).size !== placementNumbers.length) {
        return NextResponse.json({ error: "Duplicate placement numbers are not allowed." }, { status: 400 });
      }
    }

    await db.$transaction(async (tx) => {
      if (body.name !== undefined || body.suggestedType !== undefined) {
        await tx.pointsSystem.update({
          where: { id },
          data: {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.suggestedType !== undefined ? { suggestedType: body.suggestedType } : {}),
          },
        });
      }
      if (body.rules) {
        await tx.placementPointsRule.deleteMany({ where: { pointsSystemId: id } });
        await tx.placementPointsRule.createMany({
          data: body.rules.map((row) => ({
            pointsSystemId: id,
            placement: row.placement,
            points: row.points,
          })),
        });
      }
    });

    const updated = await db.pointsSystem.findUniqueOrThrow({ where: { id }, include: pointsSystemInclude });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const used = await db.sportEvent.count({ where: { pointsSystemId: id } });
    if (used > 0) {
      return NextResponse.json(
        { error: "This point system is used by an event and cannot be deleted." },
        { status: 409 },
      );
    }

    await db.pointsSystem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
