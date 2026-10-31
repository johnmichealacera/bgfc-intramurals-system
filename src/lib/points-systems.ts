import { db } from "@/lib/db";

export const DEFAULT_GROUP_RULES = [
  { placement: 1, points: 10 },
  { placement: 2, points: 7 },
  { placement: 3, points: 5 },
  { placement: 4, points: 3 },
  { placement: 5, points: 1 },
];

export const DEFAULT_SOLO_RULES = [
  { placement: 1, points: 15 },
  { placement: 2, points: 10 },
  { placement: 3, points: 7 },
  { placement: 4, points: 4 },
  { placement: 5, points: 2 },
];

export const pointsSystemInclude = {
  rules: { orderBy: { placement: "asc" as const } },
};

export async function ensureDefaultPointsSystems(seasonId: string) {
  const existing = await db.pointsSystem.findMany({ where: { seasonId }, select: { suggestedType: true } });
  const types = new Set(existing.map((row) => row.suggestedType));

  if (!types.has("TEAM_VS_TEAM")) {
    await db.pointsSystem.create({
      data: {
        seasonId,
        name: "Group",
        suggestedType: "TEAM_VS_TEAM",
        rules: { create: DEFAULT_GROUP_RULES },
      },
    });
  }
  if (!types.has("PLACEMENT")) {
    await db.pointsSystem.create({
      data: {
        seasonId,
        name: "Solo",
        suggestedType: "PLACEMENT",
        rules: { create: DEFAULT_SOLO_RULES },
      },
    });
  }
}

