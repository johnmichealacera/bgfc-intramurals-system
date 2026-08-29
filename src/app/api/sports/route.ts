import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const sportSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const sports = await db.sport.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
    return NextResponse.json(sports);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = sportSchema.parse(await req.json());
    const existing = await db.sport.findFirst({
      where: { name: { equals: body.name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "A sport with this name already exists." }, { status: 409 });
    }

    const sport = await db.sport.create({ data: body });
    return NextResponse.json(sport, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
