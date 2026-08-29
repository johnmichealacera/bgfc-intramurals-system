import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const event = await db.sportEvent.findUniqueOrThrow({
      where: { id },
      include: {
        matches: { include: { homeTeam: true, awayTeam: true, winnerTeam: true }, orderBy: { scheduledAt: "asc" } },
        placements: { include: { team: true }, orderBy: { placement: "asc" } },
      },
    });
    return NextResponse.json(event);
  } catch (error) {
    return apiError(error);
  }
}
