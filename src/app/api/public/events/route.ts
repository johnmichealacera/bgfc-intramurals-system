import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    let seasonId = new URL(req.url).searchParams.get("seasonId");
    if (!seasonId) {
      const activeSeason = await db.season.findFirst({ where: { isActive: true } });
      if (!activeSeason) return NextResponse.json([]);
      seasonId = activeSeason.id;
    }

    const events = await db.sportEvent.findMany({
      where: { seasonId },
      include: { placements: { include: { team: true }, orderBy: { placement: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (error) {
    return apiError(error);
  }
}
