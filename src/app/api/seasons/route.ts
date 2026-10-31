import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { ensureDefaultPointsSystems } from "@/lib/points-systems";

const seasonSchema = z.object({
  name: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const seasons = await db.season.findMany({ orderBy: { startDate: "desc" } });
    return NextResponse.json(seasons);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = seasonSchema.parse(await req.json());
    const season = await db.season.create({ data: body });
    await ensureDefaultPointsSystems(season.id);
    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
