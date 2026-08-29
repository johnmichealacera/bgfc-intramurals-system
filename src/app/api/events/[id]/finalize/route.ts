import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, assertRole } from "@/lib/auth";
import { apiError } from "@/lib/api-utils";
import { db } from "@/lib/db";

const finalizeSchema = z.object({
  placements: z
    .array(
      z.object({
        teamId: z.string().min(1),
        placement: z.number().int().min(1),
      }),
    )
    .min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    assertRole(session, ["ADMIN"]);

    const { id } = await params;
    const { placements } = finalizeSchema.parse(await req.json());

    const placementNumbers = placements.map((p) => p.placement);
    if (new Set(placementNumbers).size !== placementNumbers.length) {
      return NextResponse.json({ error: "Duplicate placement numbers are not allowed." }, { status: 400 });
    }
    const teamIds = placements.map((p) => p.teamId);
    if (new Set(teamIds).size !== teamIds.length) {
      return NextResponse.json({ error: "Each team can only appear once." }, { status: 400 });
    }

    const event = await db.sportEvent.findUniqueOrThrow({ where: { id } });

    if (event.type === "TEAM_VS_TEAM") {
      const unresolvedCount = await db.match.count({
        where: { sportEventId: id, status: { in: ["SCHEDULED", "LIVE", "POSTPONED"] } },
      });
      if (unresolvedCount > 0) {
        return NextResponse.json(
          { error: "All matches for this event must be finished before finalizing results." },
          { status: 409 },
        );
      }
    }

    const rules = await db.placementPointsRule.findMany({ where: { seasonId: event.seasonId } });
    const pointsByPlacement = new Map(rules.map((r) => [r.placement, r.points]));

    const warnings: string[] = [];
    const rows = placements.map((p) => {
      const points = pointsByPlacement.get(p.placement);
      if (points === undefined) {
        warnings.push(`No points rule configured for placement ${p.placement} — recorded as 0 points.`);
      }
      return { sportEventId: id, teamId: p.teamId, placement: p.placement, points: points ?? 0 };
    });

    const created = await db.$transaction(async (tx) => {
      await tx.eventPlacement.deleteMany({ where: { sportEventId: id } });
      await tx.eventPlacement.createMany({ data: rows });
      await tx.sportEvent.update({ where: { id }, data: { status: "COMPLETED" } });
      return tx.eventPlacement.findMany({ where: { sportEventId: id }, include: { team: true }, orderBy: { placement: "asc" } });
    });

    return NextResponse.json({ placements: created, warnings });
  } catch (error) {
    return apiError(error);
  }
}
