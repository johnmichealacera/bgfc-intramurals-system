import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { SPORTS_GUIDELINES } from "../src/lib/sports-guidelines";
import { getEnrollmentBlockReason } from "../src/lib/enrollment-rules";
import { generateEventBracket } from "../src/lib/bracket";

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
  await db.eventBracketGame.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.eventPlacement.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.match.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.eventParticipant.deleteMany({ where: { eventTeam: { sportEvent: { seasonId } } } });
  await db.eventTeam.deleteMany({ where: { sportEvent: { seasonId } } });
  await db.eventSchedule.deleteMany({ where: { sportEvent: { seasonId } } });
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
  const sportEvent = await db.sportEvent.findUniqueOrThrow({ where: { id: sportEventId } });
  for (const teamId of teamIds) {
    const eventTeam = await db.eventTeam.create({
      data: { sportEventId, teamId },
    });
    const roster = await db.participant.findMany({
      where: {
        teamId,
        ...(genderFilter ? { gender: genderFilter } : {}),
      },
      include: {
        eventEntries: {
          include: {
            eventTeam: {
              include: {
                sportEvent: { select: { id: true, name: true, type: true, category: true, status: true } },
              },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
    const eligible = roster
      .filter((p) => !getEnrollmentBlockReason(p, sportEvent))
      .slice(0, rosterLimit);
    if (eligible.length) {
      await db.eventParticipant.createMany({
        data: eligible.map((p) => ({
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

  const groupPoints = [
    { placement: 1, points: 10 },
    { placement: 2, points: 7 },
    { placement: 3, points: 5 },
    { placement: 4, points: 3 },
    { placement: 5, points: 1 },
  ];
  const soloPoints = [
    { placement: 1, points: 15 },
    { placement: 2, points: 10 },
    { placement: 3, points: 7 },
    { placement: 4, points: 4 },
    { placement: 5, points: 2 },
  ];
  await db.placementPointsRule.deleteMany({ where: { seasonId: season.id } });
  await db.placementPointsRule.createMany({
    data: [
      ...groupPoints.map((rule) => ({ seasonId: season.id, eventType: "TEAM_VS_TEAM" as const, ...rule })),
      ...soloPoints.map((rule) => ({ seasonId: season.id, eventType: "PLACEMENT" as const, ...rule })),
    ],
  });

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

  await db.eventSchedule.createMany({
    data: [
      {
        id: "seed-sched-dance-finals",
        sportEventId: dancesport.id,
        title: "Finals",
        scheduledAt: daysFrom(baseDay, -2, 15, 0),
        venue: "Auditorium",
      },
      {
        id: "seed-sched-chess-prelims",
        sportEventId: chess.id,
        title: "Prelims",
        scheduledAt: daysFrom(baseDay, 0, 13, 0),
        venue: "Library Hall",
      },
      {
        id: "seed-sched-chess-finals",
        sportEventId: chess.id,
        title: "Finals",
        scheduledAt: daysFrom(baseDay, 1, 13, 0),
        venue: "Library Hall",
      },
    ],
  });

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
        postponeReason: "Rain flooded the multi-purpose hall floor, so officials stopped play.",
        resumeRequestedAt: daysFrom(baseDay, 1, 16, 0),
        resumeRequestedByUserId: tabulator.id,
        resumeRequestReason:
          "The hall is now dry, tables are reset, and both teams are ready to resume this afternoon.",
      },
    ],
  });

  const groupByPlace = Object.fromEntries(groupPoints.map((r) => [r.placement, r.points]));
  const soloByPlace = Object.fromEntries(soloPoints.map((r) => [r.placement, r.points]));

  await db.eventPlacement.createMany({
    data: [
      { id: "seed-place-vb-1", sportEventId: volleyball.id, teamId: falcons.id, placement: 1, points: groupByPlace[1] },
      { id: "seed-place-vb-2", sportEventId: volleyball.id, teamId: dragons.id, placement: 2, points: groupByPlace[2] },
      { id: "seed-place-vb-3", sportEventId: volleyball.id, teamId: warriors.id, placement: 3, points: groupByPlace[3] },
      { id: "seed-place-vb-4", sportEventId: volleyball.id, teamId: phoenix.id, placement: 4, points: groupByPlace[4] },
      { id: "seed-place-vb-5", sportEventId: volleyball.id, teamId: titans.id, placement: 5, points: groupByPlace[5] },

      { id: "seed-place-dance-1", sportEventId: dancesport.id, teamId: phoenix.id, placement: 1, points: soloByPlace[1] },
      { id: "seed-place-dance-2", sportEventId: dancesport.id, teamId: knights.id, placement: 2, points: soloByPlace[2] },
      { id: "seed-place-dance-3", sportEventId: dancesport.id, teamId: falcons.id, placement: 3, points: soloByPlace[3] },
      { id: "seed-place-dance-4", sportEventId: dancesport.id, teamId: titans.id, placement: 4, points: soloByPlace[4] },
      { id: "seed-place-dance-5", sportEventId: dancesport.id, teamId: dragons.id, placement: 5, points: soloByPlace[5] },
    ],
  });

  async function seedBracket(sportEventId: string, dropExtraScheduled = false) {
    const keepIds = dropExtraScheduled
      ? (await db.match.findMany({ where: { sportEventId }, select: { id: true } })).map((m) => m.id)
      : [];
    const enrolled = await db.eventTeam.findMany({
      where: { sportEventId },
      orderBy: { team: { name: "asc" } },
    });
    await db.$transaction((tx) => generateEventBracket(tx, sportEventId, enrolled.map((entry) => entry.teamId)));
    if (dropExtraScheduled) {
      await db.match.deleteMany({
        where: { sportEventId, status: "SCHEDULED", id: { notIn: keepIds } },
      });
    }
  }

  await seedBracket(basketball.id);
  await seedBracket(volleyball.id, true);
  await seedBracket(tableTennis.id);

  async function assignMatchIfFree(userId: string, matchId: string) {
    const match = await db.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status === "SCHEDULED" || match.status === "LIVE") {
      const taken =
        (await db.match.count({
          where: {
            tabulatorUserId: userId,
            scheduledAt: match.scheduledAt,
            status: { in: ["SCHEDULED", "LIVE"] },
            id: { not: matchId },
          },
        })) +
        (await db.eventSchedule.count({
          where: { tabulatorUserId: userId, scheduledAt: match.scheduledAt, status: { in: ["SCHEDULED", "LIVE"] } },
        }));
      if (taken > 0) return;
    }
    await db.match.update({ where: { id: matchId }, data: { tabulatorUserId: userId } });
  }

  async function assignScheduleIfFree(userId: string, scheduleId: string) {
    const session = await db.eventSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
    if (session.status === "SCHEDULED" || session.status === "LIVE") {
      const taken =
        (await db.match.count({
          where: { tabulatorUserId: userId, scheduledAt: session.scheduledAt, status: { in: ["SCHEDULED", "LIVE"] } },
        })) +
        (await db.eventSchedule.count({
          where: {
            tabulatorUserId: userId,
            scheduledAt: session.scheduledAt,
            status: { in: ["SCHEDULED", "LIVE"] },
            id: { not: scheduleId },
          },
        }));
      if (taken > 0) return;
    }
    await db.eventSchedule.update({ where: { id: scheduleId }, data: { tabulatorUserId: userId } });
  }

  for (const row of await db.match.findMany({
    where: { sportEventId: { in: [basketball.id, volleyball.id, tableTennis.id] } },
    select: { id: true },
  })) {
    await assignMatchIfFree(tabulator.id, row.id);
  }
  for (const row of await db.eventSchedule.findMany({
    where: { sportEventId: { in: [dancesport.id, chess.id] } },
    select: { id: true },
  })) {
    await assignScheduleIfFree(tabulator2.id, row.id);
  }

  const [teamCount, matchCount, liveCount, placementCount, eventCount, eventTeamCount, eventRosterCount, scheduleCount, bracketCount] =
    await Promise.all([
      db.team.count({ where: { seasonId: season.id } }),
      db.match.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.match.count({ where: { status: "LIVE", sportEvent: { seasonId: season.id } } }),
      db.eventPlacement.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.sportEvent.count({ where: { seasonId: season.id } }),
      db.eventTeam.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.eventParticipant.count({ where: { eventTeam: { sportEvent: { seasonId: season.id } } } }),
      db.eventSchedule.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.eventBracketGame.count({ where: { sportEvent: { seasonId: season.id } } }),
    ]);

  console.log("Seed complete — demo data ready for presentation");
  console.log(`  Season:        ${season.name} (active)`);
  console.log(`  Users:         admin@bgfc.edu.ph / tabulator@bgfc.edu.ph / tabulator2@bgfc.edu.ph (password123)`);
  console.log(`  Teams:         ${teamCount}`);
  console.log(`  Participants:  ${participantCount}`);
  console.log(`  Events:        ${eventCount} (basketball live, volleyball done, dancesport done, …)`);
  console.log(`  Event teams:   ${eventTeamCount} enrollments / ${eventRosterCount} roster spots`);
  console.log(`  Schedules:     ${scheduleCount} placement sessions (public hype)`);
  console.log(`  Matches:       ${matchCount} (${liveCount} LIVE)`);
  console.log(`  Brackets:      ${bracketCount} elimination games`);
  console.log(`  Placements:    ${placementCount} (feeds overall standings)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
