import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { SPORTS_GUIDELINES } from "../src/lib/sports-guidelines";
import { getEnrollmentBlockReason } from "../src/lib/enrollment-rules";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const SEASON_ID = "seed-season-2027";

const TEAM_DEFS = [
  { key: "ccs", name: "Team CCS", colorHex: "#dc2626" },
  { key: "education", name: "Team Education", colorHex: "#2563eb" },
  { key: "business", name: "Team Business", colorHex: "#ea580c" },
  { key: "criminology", name: "Team Criminology", colorHex: "#059669" },
  { key: "hospitality", name: "Team Hospitality", colorHex: "#7c3aed" },
  { key: "nursing", name: "Team Nursing", colorHex: "#ca8a04" },
] as const;

type Gender = "MALE" | "FEMALE";
type RosterRow = { fullName: string; course: string; yearLevel: string; gender: Gender };

const ROSTERS: Record<(typeof TEAM_DEFS)[number]["key"], RosterRow[]> = {
  ccs: [
    { fullName: "Marco Villanueva", course: "BSIT", yearLevel: "3", gender: "MALE" },
    { fullName: "Paolo Gutierrez", course: "BSCS", yearLevel: "2", gender: "MALE" },
    { fullName: "Nathan De Leon", course: "BSIT", yearLevel: "4", gender: "MALE" },
    { fullName: "Ivan Mercado", course: "BSCS", yearLevel: "1", gender: "MALE" },
    { fullName: "Leo Francisco", course: "BSIT", yearLevel: "2", gender: "MALE" },
    { fullName: "Camille Santos", course: "BSIT", yearLevel: "3", gender: "FEMALE" },
    { fullName: "Isabel Ramos", course: "BSCS", yearLevel: "2", gender: "FEMALE" },
    { fullName: "Bianca Lim", course: "BSIT", yearLevel: "1", gender: "FEMALE" },
    { fullName: "Denise Tan", course: "BSCS", yearLevel: "4", gender: "FEMALE" },
    { fullName: "Hannah Chua", course: "BSIT", yearLevel: "2", gender: "FEMALE" },
  ],
  education: [
    { fullName: "Christian Salazar", course: "BSED", yearLevel: "3", gender: "MALE" },
    { fullName: "Raphael Castillo", course: "BEED", yearLevel: "2", gender: "MALE" },
    { fullName: "Dominic Aquino", course: "BSED", yearLevel: "4", gender: "MALE" },
    { fullName: "Kenneth Flores", course: "BSED", yearLevel: "1", gender: "MALE" },
    { fullName: "Angelo Navarro", course: "BEED", yearLevel: "3", gender: "MALE" },
    { fullName: "Patricia Mendoza", course: "BSED", yearLevel: "3", gender: "FEMALE" },
    { fullName: "Sofia Reyes", course: "BEED", yearLevel: "2", gender: "FEMALE" },
    { fullName: "Lara Bautista", course: "BSED", yearLevel: "1", gender: "FEMALE" },
    { fullName: "Jenna Villanueva", course: "BSED", yearLevel: "4", gender: "FEMALE" },
    { fullName: "Nicole Fernandez", course: "BEED", yearLevel: "2", gender: "FEMALE" },
  ],
  business: [
    { fullName: "Daniel Torres", course: "BSBA", yearLevel: "3", gender: "MALE" },
    { fullName: "Joshua Garcia", course: "BSA", yearLevel: "2", gender: "MALE" },
    { fullName: "Ryan Diaz", course: "BSBA", yearLevel: "4", gender: "MALE" },
    { fullName: "Andre Lopez", course: "BSBA", yearLevel: "1", gender: "MALE" },
    { fullName: "Francis Perez", course: "BSA", yearLevel: "3", gender: "MALE" },
    { fullName: "Angela Cruz", course: "BSBA", yearLevel: "3", gender: "FEMALE" },
    { fullName: "Kristine Santos", course: "BSA", yearLevel: "2", gender: "FEMALE" },
    { fullName: "Maria Gonzales", course: "BSBA", yearLevel: "1", gender: "FEMALE" },
    { fullName: "Camille Aquino", course: "BSBA", yearLevel: "4", gender: "FEMALE" },
    { fullName: "Therese Castillo", course: "BSA", yearLevel: "2", gender: "FEMALE" },
  ],
  criminology: [
    { fullName: "Miguel Ramos", course: "BSCrim", yearLevel: "3", gender: "MALE" },
    { fullName: "Carlo Mendoza", course: "BSCrim", yearLevel: "2", gender: "MALE" },
    { fullName: "Mark Dela Cruz", course: "BSCrim", yearLevel: "4", gender: "MALE" },
    { fullName: "Juan Salazar", course: "BSCrim", yearLevel: "1", gender: "MALE" },
    { fullName: "Paolo Bautista", course: "BSCrim", yearLevel: "3", gender: "MALE" },
    { fullName: "Andrea Flores", course: "BSCrim", yearLevel: "3", gender: "FEMALE" },
    { fullName: "Katrina Navarro", course: "BSCrim", yearLevel: "2", gender: "FEMALE" },
    { fullName: "Grace Torres", course: "BSCrim", yearLevel: "1", gender: "FEMALE" },
    { fullName: "Monica Garcia", course: "BSCrim", yearLevel: "4", gender: "FEMALE" },
    { fullName: "Jenna Diaz", course: "BSCrim", yearLevel: "2", gender: "FEMALE" },
  ],
  hospitality: [
    { fullName: "Raphael Santos", course: "BSHM", yearLevel: "3", gender: "MALE" },
    { fullName: "Ivan Reyes", course: "BSTM", yearLevel: "2", gender: "MALE" },
    { fullName: "Leo Cruz", course: "BSHM", yearLevel: "4", gender: "MALE" },
    { fullName: "Nathan Garcia", course: "BSHM", yearLevel: "1", gender: "MALE" },
    { fullName: "Christian Torres", course: "BSTM", yearLevel: "3", gender: "MALE" },
    { fullName: "Bianca Mendoza", course: "BSHM", yearLevel: "3", gender: "FEMALE" },
    { fullName: "Melissa Ortega", course: "BSTM", yearLevel: "2", gender: "FEMALE" },
    { fullName: "Lara Flores", course: "BSHM", yearLevel: "1", gender: "FEMALE" },
    { fullName: "Patricia Diaz", course: "BSHM", yearLevel: "4", gender: "FEMALE" },
    { fullName: "Sofia Navarro", course: "BSTM", yearLevel: "2", gender: "FEMALE" },
  ],
  nursing: [
    { fullName: "Angelo Fernandez", course: "BSN", yearLevel: "3", gender: "MALE" },
    { fullName: "Kenneth Villanueva", course: "BSN", yearLevel: "2", gender: "MALE" },
    { fullName: "Dominic Bautista", course: "BSN", yearLevel: "4", gender: "MALE" },
    { fullName: "Francis Aquino", course: "BSN", yearLevel: "1", gender: "MALE" },
    { fullName: "Daniel Castillo", course: "BSN", yearLevel: "3", gender: "MALE" },
    { fullName: "Hannah Lopez", course: "BSN", yearLevel: "3", gender: "FEMALE" },
    { fullName: "Denise Perez", course: "BSN", yearLevel: "2", gender: "FEMALE" },
    { fullName: "Nicole Gonzales", course: "BSN", yearLevel: "1", gender: "FEMALE" },
    { fullName: "Camille Salazar", course: "BSN", yearLevel: "4", gender: "FEMALE" },
    { fullName: "Angela De Leon", course: "BSN", yearLevel: "2", gender: "FEMALE" },
  ],
};

function at(day: string, time: string) {
  return new Date(`${day}T${time}:00+08:00`);
}

async function wipeAll() {
  await db.eventBracketGame.deleteMany();
  await db.eventPlacement.deleteMany();
  await db.match.deleteMany();
  await db.eventParticipant.deleteMany();
  await db.eventTeam.deleteMany();
  await db.eventSchedule.deleteMany();
  await db.participant.deleteMany();
  await db.sportEvent.deleteMany();
  await db.pointsSystem.deleteMany();
  await db.team.deleteMany();
  await db.season.deleteMany();
  await db.account.deleteMany();
  await db.session.deleteMany();
  await db.verificationToken.deleteMany();
  await db.user.deleteMany();
  await db.sport.deleteMany();
}

async function enrollTeams(
  sportEventId: string,
  teamIds: string[],
  genderFilter?: Gender,
  rosterLimit = 3,
) {
  const sportEvent = await db.sportEvent.findUniqueOrThrow({ where: { id: sportEventId } });
  for (const teamId of teamIds) {
    const eventTeam = await db.eventTeam.create({ data: { sportEventId, teamId } });
    const roster = await db.participant.findMany({
      where: { teamId, ...(genderFilter ? { gender: genderFilter } : {}) },
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
    const eligible = roster.filter((p) => !getEnrollmentBlockReason(p, sportEvent)).slice(0, rosterLimit);
    if (eligible.length) {
      await db.eventParticipant.createMany({
        data: eligible.map((p) => ({ eventTeamId: eventTeam.id, participantId: p.id })),
      });
    }
  }
}

async function main() {
  await wipeAll();

  const password = await hash("password123", 12);

  const admin = await db.user.create({
    data: {
      username: "admin",
      email: "maria.cruz@bgfc.edu.ph",
      name: "Maria Elena Cruz",
      password,
      role: "ADMIN",
    },
  });

  const john = await db.user.create({
    data: {
      username: "tabulator",
      email: "john.ramos@bgfc.edu.ph",
      name: "John Patrick Ramos",
      password,
      role: "TABULATOR",
    },
  });

  const anna = await db.user.create({
    data: {
      username: "tabulator2",
      email: "anna.reyes@bgfc.edu.ph",
      name: "Anna Sophia Reyes",
      password,
      role: "TABULATOR",
    },
  });

  const season = await db.season.create({
    data: {
      id: SEASON_ID,
      name: "BGFC Intramurals 2027",
      isActive: true,
      startDate: at("2027-02-08", "08:00"),
      endDate: at("2027-02-20", "18:00"),
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
  const literaryPoints = [
    { placement: 1, points: 12 },
    { placement: 2, points: 9 },
    { placement: 3, points: 6 },
    { placement: 4, points: 3 },
  ];
  const pageantPoints = [
    { placement: 1, points: 15 },
    { placement: 2, points: 10 },
    { placement: 3, points: 8 },
    { placement: 4, points: 5 },
    { placement: 5, points: 3 },
  ];

  const groupSystem = await db.pointsSystem.create({
    data: { seasonId: season.id, name: "Group", suggestedType: "TEAM_VS_TEAM", rules: { create: groupPoints } },
  });
  const soloSystem = await db.pointsSystem.create({
    data: { seasonId: season.id, name: "Solo", suggestedType: "PLACEMENT", rules: { create: soloPoints } },
  });
  const literarySystem = await db.pointsSystem.create({
    data: { seasonId: season.id, name: "Literary", rules: { create: literaryPoints } },
  });
  const pageantSystem = await db.pointsSystem.create({
    data: { seasonId: season.id, name: "Pageant", rules: { create: pageantPoints } },
  });

  for (const sport of SPORTS_GUIDELINES) {
    await db.sport.create({
      data: { name: sport.name, type: sport.suggestedEventType, isDefault: true },
    });
  }
  await db.sport.createMany({
    data: [
      { name: "Literary", type: "PLACEMENT", isDefault: true },
      { name: "Pageant", type: "PLACEMENT", isDefault: true },
    ],
  });

  const teams = [];
  for (const def of TEAM_DEFS) {
    const team = await db.team.create({
      data: { seasonId: season.id, name: def.name, colorHex: def.colorHex },
    });
    teams.push({ ...team, key: def.key });
  }

  const byKey = Object.fromEntries(teams.map((t) => [t.key, t])) as Record<(typeof TEAM_DEFS)[number]["key"], (typeof teams)[number]>;
  const allTeamIds = teams.map((t) => t.id);

  let participantCount = 0;
  for (const team of teams) {
    for (const row of ROSTERS[team.key]) {
      await db.participant.create({
        data: {
          seasonId: season.id,
          teamId: team.id,
          fullName: row.fullName,
          course: row.course,
          yearLevel: row.yearLevel,
          gender: row.gender,
        },
      });
      participantCount += 1;
    }
  }

  const basketball = await db.sportEvent.create({
    data: {
      seasonId: season.id,
      name: "Basketball",
      type: "TEAM_VS_TEAM",
      category: "MEN",
      status: "ONGOING",
      description: "Men's basketball — live scoring and remaining scheduled games.",
      pointsSystemId: groupSystem.id,
    },
  });
  const volleyball = await db.sportEvent.create({
    data: {
      seasonId: season.id,
      name: "Volleyball",
      type: "TEAM_VS_TEAM",
      category: "WOMEN",
      status: "COMPLETED",
      description: "Women's volleyball — finalized for overall standings.",
      pointsSystemId: groupSystem.id,
    },
  });
  const chess = await db.sportEvent.create({
    data: {
      seasonId: season.id,
      name: "Chess",
      type: "PLACEMENT",
      category: "MIXED",
      status: "ONGOING",
      description: "Board finals in progress.",
      pointsSystemId: soloSystem.id,
    },
  });
  const literary = await db.sportEvent.create({
    data: {
      seasonId: season.id,
      name: "Literary",
      type: "PLACEMENT",
      category: "MIXED",
      status: "ONGOING",
      description: "Oration and spoken-word field events.",
      pointsSystemId: literarySystem.id,
    },
  });
  const pageant = await db.sportEvent.create({
    data: {
      seasonId: season.id,
      name: "Pageant",
      type: "PLACEMENT",
      category: "MIXED",
      status: "UPCOMING",
      description: "Mr. and Ms. Intramurals coronation night.",
      pointsSystemId: pageantSystem.id,
    },
  });

  await enrollTeams(basketball.id, allTeamIds, "MALE", 3);
  await enrollTeams(volleyball.id, allTeamIds, "FEMALE", 3);
  await enrollTeams(chess.id, [byKey.ccs.id, byKey.education.id, byKey.business.id, byKey.criminology.id], undefined, 2);
  await enrollTeams(literary.id, allTeamIds, undefined, 2);
  await enrollTeams(pageant.id, allTeamIds, undefined, 2);

  await db.match.createMany({
    data: [
      {
        sportEventId: basketball.id,
        homeTeamId: byKey.ccs.id,
        awayTeamId: byKey.education.id,
        homeScore: 48,
        awayScore: 44,
        status: "LIVE",
        scheduledAt: at("2027-02-10", "09:00"),
        venue: "Main Court",
        tabulatorUserId: john.id,
        updatedByUserId: john.id,
      },
      {
        sportEventId: basketball.id,
        homeTeamId: byKey.business.id,
        awayTeamId: byKey.criminology.id,
        homeScore: 62,
        awayScore: 57,
        status: "FINISHED",
        winnerTeamId: byKey.business.id,
        scheduledAt: at("2027-02-09", "14:00"),
        venue: "Main Court",
        tabulatorUserId: john.id,
        updatedByUserId: john.id,
      },
      {
        sportEventId: basketball.id,
        homeTeamId: byKey.hospitality.id,
        awayTeamId: byKey.nursing.id,
        homeScore: 51,
        awayScore: 55,
        status: "FINISHED",
        winnerTeamId: byKey.nursing.id,
        scheduledAt: at("2027-02-09", "16:00"),
        venue: "Covered Court",
        tabulatorUserId: anna.id,
        updatedByUserId: anna.id,
      },
      {
        sportEventId: basketball.id,
        homeTeamId: byKey.ccs.id,
        awayTeamId: byKey.business.id,
        status: "SCHEDULED",
        scheduledAt: at("2027-02-10", "15:00"),
        venue: "Main Court",
        tabulatorUserId: john.id,
      },
      {
        sportEventId: basketball.id,
        homeTeamId: byKey.education.id,
        awayTeamId: byKey.nursing.id,
        status: "SCHEDULED",
        scheduledAt: at("2027-02-11", "09:00"),
        venue: "Covered Court",
        tabulatorUserId: anna.id,
        controlRequestedAt: at("2027-02-10", "08:30"),
        controlRequestedByUserId: anna.id,
        controlRequestReason: "Both teams are warmed up and ready to go live this morning.",
      },
      {
        sportEventId: basketball.id,
        homeTeamId: byKey.hospitality.id,
        awayTeamId: byKey.criminology.id,
        status: "POSTPONED",
        scheduledAt: at("2027-02-11", "14:00"),
        venue: "Main Court",
        tabulatorUserId: john.id,
        postponeReason: "Court lights failed during warm-up, so officials stopped the game.",
        resumeRequestedAt: at("2027-02-11", "16:00"),
        resumeRequestedByUserId: john.id,
        resumeRequestReason: "Lights are restored and both teams can resume this afternoon.",
      },
      {
        sportEventId: volleyball.id,
        homeTeamId: byKey.education.id,
        awayTeamId: byKey.ccs.id,
        homeScore: 25,
        awayScore: 19,
        status: "FINISHED",
        winnerTeamId: byKey.education.id,
        scheduledAt: at("2027-02-08", "09:00"),
        venue: "Gymnasium",
        tabulatorUserId: anna.id,
        updatedByUserId: anna.id,
      },
      {
        sportEventId: volleyball.id,
        homeTeamId: byKey.nursing.id,
        awayTeamId: byKey.business.id,
        homeScore: 25,
        awayScore: 21,
        status: "FINISHED",
        winnerTeamId: byKey.nursing.id,
        scheduledAt: at("2027-02-08", "11:00"),
        venue: "Gymnasium",
        tabulatorUserId: anna.id,
        updatedByUserId: anna.id,
      },
      {
        sportEventId: volleyball.id,
        homeTeamId: byKey.hospitality.id,
        awayTeamId: byKey.criminology.id,
        homeScore: 25,
        awayScore: 17,
        status: "FINISHED",
        winnerTeamId: byKey.hospitality.id,
        scheduledAt: at("2027-02-08", "14:00"),
        venue: "Gymnasium",
        tabulatorUserId: john.id,
        updatedByUserId: john.id,
      },
      {
        sportEventId: volleyball.id,
        homeTeamId: byKey.education.id,
        awayTeamId: byKey.nursing.id,
        homeScore: 25,
        awayScore: 23,
        status: "FINISHED",
        winnerTeamId: byKey.education.id,
        scheduledAt: at("2027-02-09", "09:00"),
        venue: "Gymnasium",
        tabulatorUserId: anna.id,
        updatedByUserId: anna.id,
      },
    ],
  });

  const literaryScores = [
    { teamId: byKey.education.id, score: 91 },
    { teamId: byKey.ccs.id, score: 88 },
    { teamId: byKey.nursing.id, score: 84 },
    { teamId: byKey.business.id, score: 79 },
    { teamId: byKey.hospitality.id, score: 76 },
    { teamId: byKey.criminology.id, score: 72 },
  ];

  await db.eventSchedule.create({
    data: {
      sportEventId: literary.id,
      title: "Oration Prelims",
      scheduledAt: at("2027-02-10", "13:00"),
      venue: "College Auditorium",
      status: "LIVE",
      tabulatorUserId: anna.id,
      updatedByUserId: anna.id,
      scores: { create: literaryScores },
    },
  });
  await db.eventSchedule.create({
    data: {
      sportEventId: literary.id,
      title: "Oration Finals",
      scheduledAt: at("2027-02-11", "13:00"),
      venue: "College Auditorium",
      status: "SCHEDULED",
      tabulatorUserId: anna.id,
      scores: { create: allTeamIds.map((teamId) => ({ teamId, score: 0 })) },
    },
  });
  await db.eventSchedule.create({
    data: {
      sportEventId: pageant.id,
      title: "Coronation Night",
      scheduledAt: at("2027-02-12", "18:00"),
      venue: "College Gymnasium",
      status: "SCHEDULED",
      tabulatorUserId: john.id,
      scores: { create: allTeamIds.map((teamId) => ({ teamId, score: 0 })) },
    },
  });
  await db.eventSchedule.create({
    data: {
      sportEventId: chess.id,
      title: "Board 1",
      scheduledAt: at("2027-02-10", "10:30"),
      venue: "Library Hall",
      status: "LIVE",
      tabulatorUserId: anna.id,
      updatedByUserId: anna.id,
      scores: {
        create: [
          { teamId: byKey.ccs.id, score: 1 },
          { teamId: byKey.education.id, score: 0 },
        ],
      },
    },
  });
  await db.eventSchedule.create({
    data: {
      sportEventId: chess.id,
      title: "Board 2",
      scheduledAt: at("2027-02-11", "10:30"),
      venue: "Library Hall",
      status: "SCHEDULED",
      tabulatorUserId: john.id,
      scores: {
        create: [
          { teamId: byKey.business.id, score: 0 },
          { teamId: byKey.criminology.id, score: 0 },
        ],
      },
    },
  });

  const groupByPlace = Object.fromEntries(groupPoints.map((r) => [r.placement, r.points]));
  await db.eventPlacement.createMany({
    data: [
      { sportEventId: volleyball.id, teamId: byKey.education.id, placement: 1, points: groupByPlace[1] },
      { sportEventId: volleyball.id, teamId: byKey.nursing.id, placement: 2, points: groupByPlace[2] },
      { sportEventId: volleyball.id, teamId: byKey.hospitality.id, placement: 3, points: groupByPlace[3] },
      { sportEventId: volleyball.id, teamId: byKey.ccs.id, placement: 4, points: groupByPlace[4] },
      { sportEventId: volleyball.id, teamId: byKey.business.id, placement: 5, points: groupByPlace[5] },
    ],
  });

  const [teamCount, matchCount, liveMatchCount, eventCount, scheduleCount, liveSessionCount, placementCount] =
    await Promise.all([
      db.team.count({ where: { seasonId: season.id } }),
      db.match.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.match.count({ where: { status: "LIVE", sportEvent: { seasonId: season.id } } }),
      db.sportEvent.count({ where: { seasonId: season.id } }),
      db.eventSchedule.count({ where: { sportEvent: { seasonId: season.id } } }),
      db.eventSchedule.count({ where: { status: "LIVE", sportEvent: { seasonId: season.id } } }),
      db.eventPlacement.count({ where: { sportEvent: { seasonId: season.id } } }),
    ]);

  console.log("Seed complete — BGFC Intramurals 2027");
  console.log(`  Users:         admin / tabulator / tabulator2  (password123)`);
  console.log(`                 Maria Elena Cruz · John Patrick Ramos · Anna Sophia Reyes`);
  console.log(`  Season:        ${season.name} (active)`);
  console.log(`  Teams:         ${teamCount}`);
  console.log(`  Participants:  ${participantCount}`);
  console.log(`  Events:        ${eventCount} (basketball, volleyball, chess, literary, pageant)`);
  console.log(`  Matches:       ${matchCount} (${liveMatchCount} LIVE)`);
  console.log(`  Sessions:      ${scheduleCount} (${liveSessionCount} LIVE)`);
  console.log(`  Placements:    ${placementCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
