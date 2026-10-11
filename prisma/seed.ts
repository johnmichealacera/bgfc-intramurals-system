import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { SPORTS_GUIDELINES } from "../src/lib/sports-guidelines";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const SEASON_ID = "seed-season-2026";

const TEAM_DEFS = [
  { id: "seed-team-falcons", name: "Team Falcons", colorHex: "#dc2626" },
  { id: "seed-team-phoenix", name: "Team Phoenix", colorHex: "#ea580c" },
  { id: "seed-team-titans", name: "Team Titans", colorHex: "#2563eb" },
  { id: "seed-team-warriors", name: "Team Warriors", colorHex: "#7c3aed" },
  { id: "seed-team-dragons", name: "Team Dragons", colorHex: "#059669" },
  { id: "seed-team-knights", name: "Team Knights", colorHex: "#ca8a04" },
] as const;

const FIRST_NAMES_M = ["Juan", "Mark", "Carlo", "Joshua", "Miguel", "Andre", "Ryan", "Paolo"];
const FIRST_NAMES_F = ["Maria", "Angela", "Kristine", "Sofia", "Jenna", "Lara", "Patricia", "Nicole"];
const LAST_NAMES = ["Santos", "Reyes", "Cruz", "Garcia", "Torres", "Mendoza", "Ramos", "Flores", "Diaz", "Navarro"];
const COURSES = ["BSIT", "BSCS", "BSBA", "BSED", "BSCrim", "BSHM"];

function daysFrom(base: Date, offsetDays: number, hours = 9, minutes = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function clearSeasonData(seasonId: string) {
  await db.eventPlacement.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.match.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.eventTabulator.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.eventParticipant.deleteMany({ where: { eventTeam: { sportEvent: { seasonId } } } });
  await db.eventTeam.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.participant.deleteMany({ where: { seasonId } });
  await db.sportEvent.deleteMany({ where: { seasonId } });
  await db.team.deleteMany({ where: { seasonId } });
}

async function enrollTeams(
  sportEventId: string,
  teamIds: string[],
  genderFilter?: "MALE" | "FEMALE",
  rosterLimit = 3,
) {
  for (const teamId of teamIds) {
    const eventTeam = await db.eventTeam.create({
      data: { sportEventId, teamId },
    });
    const roster = await db.participant.findMany({
      where: {
        teamId,
        ...(genderFilter ? { gender: genderFilter } : {}),
      },
      orderBy: { fullName: "asc" },
      take: rosterLimit,
    });
    if (roster.length) {
      await db.eventParticipant.createMany({
        data: roster.map((p) => ({
          eventTeamId: eventTeam.id,
          participantId: p.id,
        })),
      });
    }
  }
}

async function main() {
  const password = await hash("password123", 12);

  const admin = await db.user.upsert({
    where: { email: "admin@bgfc.edu.ph" },
    update: { name: "Intramurals Admin", password, role: "ADMIN", isActive: true },
    create: {
      email: "admin@bgfc.edu.ph",
      name: "Intramurals Admin",
      password,
      role: "ADMIN",
    },
  });

  const tabulator = await db.user.upsert({
    where: { email: "tabulator@bgfc.edu.ph" },
    update: { name: "Court Side Tabulator", password, role: "TABULATOR", isActive: true },
    create: {
      email: "tabulator@bgfc.edu.ph",
      name: "Court Side Tabulator",
      password,
      role: "TABULATOR",
    },
  });

  const tabulator2 = await db.user.upsert({
    where: { email: "tabulator2@bgfc.edu.ph" },
    update: { name: "Gym Tabulator", password, role: "TABULATOR", isActive: true },
    create: {
      email: "tabulator2@bgfc.edu.ph",
      name: "Gym Tabulator",
      password,
      role: "TABULATOR",
    },
  });

  await db.season.updateMany({
    where: { isActive: true, NOT: { id: SEASON_ID } },
    data: { isActive: false },
  });

  const season = await db.season.upsert({
    where: { id: SEASON_ID },
    update: {
      name: "BGFC Intramurals 2026",
      isActive: true,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
    },
    create: {
      id: SEASON_ID,
      name: "BGFC Intramurals 2026",
      isActive: true,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
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
    await db.sport.upsert({
      where: { name: sport.name },
      update: { isDefault: true, type: sport.suggestedEventType },
      create: { name: sport.name, type: sport.suggestedEventType, isDefault: true },
    });
  }

  await clearSeasonData(season.id);

  const teams = [];
  for (const def of TEAM_DEFS) {
    const team = await db.team.create({
      data: {
        id: def.id,
        seasonId: season.id,
        name: def.name,
        colorHex: def.colorHex,
      },
    });
    teams.push(team);
  }

  const [falcons, phoenix, titans, warriors, dragons, knights] = teams;

  let participantCount = 0;
  for (let t = 0; t < teams.length; t++) {
    const team = teams[t];
    for (let i = 0; i < 6; i++) {
      const isFemale = i % 2 === 1;
      const first = isFemale ? FIRST_NAMES_F[(t + i) % FIRST_NAMES_F.length] : FIRST_NAMES_M[(t + i) % FIRST_NAMES_M.length];
      const last = LAST_NAMES[(t * 3 + i) % LAST_NAMES.length];
      await db.participant.create({
        data: {
          id: `seed-participant-${team.id}-${i + 1}`,
          seasonId: season.id,
          teamId: team.id,
          fullName: `${first} ${last}`,
          course: COURSES[(t + i) % COURSES.length],
          yearLevel: `${(i % 4) + 1}`,
          gender: isFemale ? "FEMALE" : "MALE",
        },
      });
      participantCount++;
    }
  }

  const baseDay = new Date("2026-10-04T00:00:00");

  const basketball = await db.sportEvent.create({
    data: {
      id: "seed-event-basketball-men",
      seasonId: season.id,
      name: "Basketball",
      type: "TEAM_VS_TEAM",
      category: "MEN",
      status: "ONGOING",
      description: "Men's basketball division — live demo event for courtside scoring.",
    },
  });

  const volleyball = await db.sportEvent.create({
    data: {
      id: "seed-event-volleyball-women",
      seasonId: season.id,
      name: "Volleyball",
      type: "TEAM_VS_TEAM",
      category: "WOMEN",
      status: "COMPLETED",
      description: "Women's volleyball division — finalized for overall standings.",
    },
  });

  const tableTennis = await db.sportEvent.create({
    data: {
      id: "seed-event-table-tennis-men",
      seasonId: season.id,
      name: "Table Tennis",
      type: "TEAM_VS_TEAM",
      category: "MEN",
      status: "UPCOMING",
      description: "Men's table tennis — upcoming scheduled matches.",
    },
  });

  const dancesport = await db.sportEvent.create({
    data: {
      id: "seed-event-dancesport",
      seasonId: season.id,
      name: "Dancesport",
      type: "PLACEMENT",
      category: "MIXED",
      status: "COMPLETED",
      description: "Placement-based dancesport finals — points already recorded.",
    },
  });

  const chess = await db.sportEvent.create({
    data: {
      id: "seed-event-chess",
      seasonId: season.id,
      name: "Chess",
      type: "PLACEMENT",
      category: "MIXED",
      status: "ONGOING",
      description: "Chess tournament in progress — placements pending finalization.",
    },
  });

  for (const eventId of [basketball.id, volleyball.id, tableTennis.id]) {
    await db.eventTabulator.create({
      data: { sportEventId: eventId, userId: tabulator.id },
    });
  }
  await db.eventTabulator.create({
    data: { sportEventId: dancesport.id, userId: tabulator2.id },
  });
  await db.eventTabulator.create({
    data: { sportEventId: chess.id, userId: tabulator2.id },
  });

  const allTeamIds = teams.map((t) => t.id);
  await enrollTeams(basketball.id, allTeamIds, "MALE", 3);
  await enrollTeams(volleyball.id, allTeamIds, "FEMALE", 3);
  await enrollTeams(tableTennis.id, allTeamIds, "MALE", 2);
  await enrollTeams(
    dancesport.id,
    [phoenix.id, knights.id, falcons.id, titans.id, dragons.id],
    undefined,
    4,
  );
  await enrollTeams(chess.id, [falcons.id, phoenix.id, titans.id, warriors.id], undefined, 2);

  await db.match.createMany({
    data: [
      {
        id: "seed-match-bball-live-1",
        sportEventId: basketball.id,
        homeTeamId: falcons.id,
        awayTeamId: phoenix.id,
        homeScore: 42,
        awayScore: 39,
        status: "LIVE",
        scheduledAt: daysFrom(baseDay, 0, 9, 0),
        venue: "Main Court",
        updatedByUserId: tabulator.id,
      },
      {
        id: "seed-match-bball-live-2",
        sportEventId: basketball.id,
        homeTeamId: titans.id,
        awayTeamId: warriors.id,
        homeScore: 28,
        awayScore: 31,
        status: "LIVE",
        scheduledAt: daysFrom(baseDay, 0, 10, 30),
        venue: "Covered Court A",
        updatedByUserId: tabulator.id,
      },
      {
        id: "seed-match-bball-done-1",
        sportEventId: basketball.id,
        homeTeamId: dragons.id,
        awayTeamId: knights.id,
        homeScore: 68,
        awayScore: 61,
        status: "FINISHED",
        winnerTeamId: dragons.id,
        scheduledAt: daysFrom(baseDay, -1, 14, 0),
        venue: "Main Court",
        updatedByUserId: tabulator.id,
      },
      {
        id: "seed-match-bball-done-2",
        sportEventId: basketball.id,
        homeTeamId: falcons.id,
        awayTeamId: titans.id,
        homeScore: 55,
        awayScore: 58,
        status: "FINISHED",
        winnerTeamId: titans.id,
        scheduledAt: daysFrom(baseDay, -1, 16, 0),
        venue: "Covered Court A",
        updatedByUserId: admin.id,
      },
      {
        id: "seed-match-bball-sched-1",
        sportEventId: basketball.id,
        homeTeamId: phoenix.id,
        awayTeamId: dragons.id,
        status: "SCHEDULED",
        scheduledAt: daysFrom(baseDay, 0, 15, 0),
        venue: "Main Court",
      },
      {
        id: "seed-match-bball-sched-2",
        sportEventId: basketball.id,
        homeTeamId: warriors.id,
        awayTeamId: knights.id,
        status: "SCHEDULED",
        scheduledAt: daysFrom(baseDay, 1, 9, 0),
        venue: "Covered Court B",
      },
      {
        id: "seed-match-vb-1",
        sportEventId: volleyball.id,
        homeTeamId: falcons.id,
        awayTeamId: phoenix.id,
        homeScore: 25,
        awayScore: 20,
        status: "FINISHED",
        winnerTeamId: falcons.id,
        scheduledAt: daysFrom(baseDay, -3, 9, 0),
        venue: "Gymnasium",
        updatedByUserId: tabulator.id,
      },
      {
        id: "seed-match-vb-2",
        sportEventId: volleyball.id,
        homeTeamId: titans.id,
        awayTeamId: warriors.id,
        homeScore: 22,
        awayScore: 25,
        status: "FINISHED",
        winnerTeamId: warriors.id,
        scheduledAt: daysFrom(baseDay, -3, 11, 0),
        venue: "Gymnasium",
        updatedByUserId: tabulator.id,
      },
      {
        id: "seed-match-vb-3",
        sportEventId: volleyball.id,
        homeTeamId: dragons.id,
        awayTeamId: knights.id,
        homeScore: 25,
        awayScore: 18,
        status: "FINISHED",
        winnerTeamId: dragons.id,
        scheduledAt: daysFrom(baseDay, -2, 9, 0),
        venue: "Gymnasium",
        updatedByUserId: tabulator.id,
      },
      {
        id: "seed-match-vb-4",
        sportEventId: volleyball.id,
        homeTeamId: falcons.id,
        awayTeamId: warriors.id,
        homeScore: 25,
        awayScore: 23,
        status: "FINISHED",
        winnerTeamId: falcons.id,
        scheduledAt: daysFrom(baseDay, -2, 13, 0),
        venue: "Gymnasium",
        updatedByUserId: admin.id,
      },
      {
        id: "seed-match-tt-1",
        sportEventId: tableTennis.id,
        homeTeamId: phoenix.id,
        awayTeamId: titans.id,
        status: "SCHEDULED",
        scheduledAt: daysFrom(baseDay, 2, 10, 0),
        venue: "Multi-Purpose Hall",
      },
      {
        id: "seed-match-tt-2",
        sportEventId: tableTennis.id,
        homeTeamId: falcons.id,
        awayTeamId: knights.id,
        status: "SCHEDULED",
        scheduledAt: daysFrom(baseDay, 2, 11, 0),
        venue: "Multi-Purpose Hall",
      },
      {
        id: "seed-match-tt-3",
        sportEventId: tableTennis.id,
        homeTeamId: dragons.id,
        awayTeamId: warriors.id,
        status: "POSTPONED",
        scheduledAt: daysFrom(baseDay, 1, 14, 0),
        venue: "Multi-Purpose Hall",
      },
    ],
  });

  const pointsByPlace = Object.fromEntries(defaultPoints.map((r) => [r.placement, r.points]));

  await db.eventPlacement.createMany({
    data: [
      { id: "seed-place-vb-1", sportEventId: volleyball.id, teamId: falcons.id, placement: 1, points: pointsByPlace[1] },
      { id: "seed-place-vb-2", sportEventId: volleyball.id, teamId: dragons.id, placement: 2, points: pointsByPlace[2] },
      { id: "seed-place-vb-3", sportEventId: volleyball.id, teamId: warriors.id, placement: 3, points: pointsByPlace[3] },
      { id: "seed-place-vb-4", sportEventId: volleyball.id, teamId: phoenix.id, placement: 4, points: pointsByPlace[4] },
      { id: "seed-place-vb-5", sportEventId: volleyball.id, teamId: titans.id, placement: 5, points: pointsByPlace[5] },

      { id: "seed-place-dance-1", sportEventId: dancesport.id, teamId: phoenix.id, placement: 1, points: pointsByPlace[1] },
      { id: "seed-place-dance-2", sportEventId: dancesport.id, teamId: knights.id, placement: 2, points: pointsByPlace[2] },
      { id: "seed-place-dance-3", sportEventId: dancesport.id, teamId: falcons.id, placement: 3, points: pointsByPlace[3] },
      { id: "seed-place-dance-4", sportEventId: dancesport.id, teamId: titans.id, placement: 4, points: pointsByPlace[4] },
      { id: "seed-place-dance-5", sportEventId: dancesport.id, teamId: dragons.id, placement: 5, points: pointsByPlace[5] },
    ],
  });

  const [teamCount, matchCount, liveCount, placementCount, eventCount, eventTeamCount, eventRosterCount] =
    await Promise.all([
      db.team.count({ where: { seasonId: season.id } }),
      db.match.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.match.count({ where: { status: "LIVE", sportEvent: { seasonId: season.id } } }),
      db.eventPlacement.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.sportEvent.count({ where: { seasonId: season.id } }),
      db.eventTeam.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.eventParticipant.count({ where: { eventTeam: { sportEvent: { seasonId: season.id } } } }),
    ]);

  console.log("Seed complete — demo data ready for presentation");
  console.log(`  Season:        ${season.name} (active)`);
  console.log(`  Users:         admin@bgfc.edu.ph / tabulator@bgfc.edu.ph / tabulator2@bgfc.edu.ph (password123)`);
  console.log(`  Teams:         ${teamCount}`);
  console.log(`  Participants:  ${participantCount}`);
  console.log(`  Events:        ${eventCount} (basketball live, volleyball done, dancesport done, …)`);
  console.log(`  Event teams:   ${eventTeamCount} enrollments / ${eventRosterCount} roster spots`);
  console.log(`  Matches:       ${matchCount} (${liveCount} LIVE)`);
  console.log(`  Placements:    ${placementCount} (feeds overall standings)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
