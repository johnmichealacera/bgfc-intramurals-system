import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { pointsSystemInclude } from "@/lib/points-systems";

const createSchema = z.object({
  seasonId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  suggestedType: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) return NextResponse.json({ error: "seasonId is required" }, { status: 400 });

    const systems = await db.pointsSystem.findMany({
      where: { seasonId },
      include: pointsSystemInclude,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(systems);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = createSchema.parse(await req.json());
    const system = await db.pointsSystem.create({
      data: {
        seasonId: body.seasonId,
        name: body.name,
        suggestedType: body.suggestedType ?? null,
      },
      include: pointsSystemInclude,
    });
    return NextResponse.json(system, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
