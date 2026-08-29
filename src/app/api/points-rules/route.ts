import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const bulkUpsertSchema = z.object({
  seasonId: z.string().min(1),
  rules: z
    .array(
      z.object({
        placement: z.number().int().min(1),
        points: z.number().int().min(0),
      }),
    )
    .min(1),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) return NextResponse.json({ error: "seasonId is required" }, { status: 400 });

    const rules = await db.placementPointsRule.findMany({
      where: { seasonId },
      orderBy: { placement: "asc" },
    });
    return NextResponse.json(rules);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { seasonId, rules } = bulkUpsertSchema.parse(await req.json());

    const placementNumbers = rules.map((r) => r.placement);
    if (new Set(placementNumbers).size !== placementNumbers.length) {
      return NextResponse.json({ error: "Duplicate placement numbers are not allowed." }, { status: 400 });
    }

    await db.$transaction([
      db.placementPointsRule.deleteMany({ where: { seasonId } }),
      db.placementPointsRule.createMany({
        data: rules.map((r) => ({ seasonId, placement: r.placement, points: r.points })),
      }),
    ]);

    const updated = await db.placementPointsRule.findMany({ where: { seasonId }, orderBy: { placement: "asc" } });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
