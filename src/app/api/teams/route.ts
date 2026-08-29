import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const teamSchema = z.object({
  seasonId: z.string().min(1),
  name: z.string().min(1),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const seasonId = new URL(req.url).searchParams.get("seasonId");
    const teams = await db.team.findMany({
      where: seasonId ? { seasonId } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(teams);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = teamSchema.parse(await req.json());
    const team = await db.team.create({ data: body });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
