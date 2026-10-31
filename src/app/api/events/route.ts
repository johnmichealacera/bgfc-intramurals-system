import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const eventSchema = z.object({
  seasonId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["TEAM_VS_TEAM", "PLACEMENT"]),
  category: z.enum(["MEN", "WOMEN", "MIXED"]).optional(),
  description: z.string().optional(),
  pointsSystemId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN", "TABULATOR"]);

    const seasonId = new URL(req.url).searchParams.get("seasonId");
    const role = session!.user.role;
    const userId = session!.user.id;

    const events = await db.sportEvent.findMany({
      where: {
        ...(seasonId ? { seasonId } : {}),
        ...(role === "TABULATOR"
          ? {
              OR: [
                { matches: { some: { tabulatorUserId: userId } } },
                { schedules: { some: { tabulatorUserId: userId } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { matches: true, placements: true } },
        pointsSystem: { select: { id: true, name: true, suggestedType: true } },
      },
    });
    return NextResponse.json(events);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const body = eventSchema.parse(await req.json());
    const system = await db.pointsSystem.findFirst({
      where: { id: body.pointsSystemId, seasonId: body.seasonId },
    });
    if (!system) {
      return NextResponse.json({ error: "Choose a point system from this season." }, { status: 400 });
    }
    const event = await db.sportEvent.create({
      data: body,
      include: { pointsSystem: { select: { id: true, name: true, suggestedType: true } } },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
