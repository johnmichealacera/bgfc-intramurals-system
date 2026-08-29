import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { SPORTS_GUIDELINES } from "../src/lib/sports-guidelines";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const password = await hash("password123", 12);

  await db.user.upsert({
    where: { email: "admin@bgfc.edu.ph" },
    update: {},
    create: {
      email: "admin@bgfc.edu.ph",
      name: "Intramurals Admin",
      password,
      role: "ADMIN",
    },
  });

  const tabulatorPassword = await hash("password123", 12);
  await db.user.upsert({
    where: { email: "tabulator@bgfc.edu.ph" },
    update: {},
    create: {
      email: "tabulator@bgfc.edu.ph",
      name: "Sample Tabulator",
      password: tabulatorPassword,
      role: "TABULATOR",
    },
  });

  const season = await db.season.upsert({
    where: { id: "seed-season-2026" },
    update: {},
    create: {
      id: "seed-season-2026",
      name: "Intramurals 2026",
      isActive: true,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-07"),
    },
  });

  const defaultPoints = [
    { placement: 1, points: 10 },
    { placement: 2, points: 7 },
    { placement: 3, points: 5 },
    { placement: 4, points: 3 },
    { placement: 5, points: 1 },
  ];
  for (const rule of defaultPoints) {
    await db.placementPointsRule.upsert({
      where: { seasonId_placement: { seasonId: season.id, placement: rule.placement } },
      update: { points: rule.points },
      create: { seasonId: season.id, placement: rule.placement, points: rule.points },
    });
  }

  for (const sport of SPORTS_GUIDELINES) {
    await db.sportEvent.upsert({
      where: { id: `seed-event-${sport.slug}` },
      update: {},
      create: {
        id: `seed-event-${sport.slug}`,
        seasonId: season.id,
        name: sport.name,
        type: sport.suggestedEventType,
        description: sport.overview,
      },
    });

    await db.sport.upsert({
      where: { name: sport.name },
      update: { isDefault: true },
      create: { name: sport.name, type: sport.suggestedEventType, isDefault: true },
    });
  }

  console.log(`Seed complete — ${SPORTS_GUIDELINES.length} default sports added to ${season.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
