export type Season = {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

export type Team = {
  id: string;
  seasonId: string;
  name: string;
  colorHex: string;
  _count?: { participants: number };
};

export type ParticipantGender = "MALE" | "FEMALE";
export type SportEventType = "TEAM_VS_TEAM" | "PLACEMENT";
export type SportEventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type SportEventCategory = "MEN" | "WOMEN" | "MIXED";

export type Participant = {
  id: string;
  seasonId: string;
  teamId: string | null;
  fullName: string;
  course: string;
  yearLevel: string | null;
  gender: ParticipantGender | null;
  team?: { id: string; name: string; colorHex: string } | null;
  eventEntries?: {
    id: string;
    eventTeam: {
      id: string;
      sportEvent: { id: string; name: string; type: SportEventType; category: SportEventCategory | null; status: SportEventStatus };
    };
  }[];
};

export type EventTeamEntry = {
  id: string;
  sportEventId: string;
  teamId: string;
  team: Team;
  participants: {
    id: string;
    participantId: string;
    participant: Participant;
  }[];
};

export type TeamDetail = Team & {
  season: Season;
  participants: Participant[];
  eventTeams?: {
    id: string;
    sportEvent: { id: string; name: string; type: SportEventType; category: SportEventCategory | null; status: SportEventStatus };
    participants: { id: string; participantId: string }[];
  }[];
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TABULATOR";
  isActive: boolean;
  createdAt: string;
};

export type Sport = {
  id: string;
  name: string;
  type: SportEventType;
  isDefault: boolean;
};

export type EventSchedule = {
  id: string;
  sportEventId: string;
  title: string | null;
  scheduledAt: string;
  venue: string | null;
};

export type SportEvent = {
  id: string;
  seasonId: string;
  name: string;
  type: SportEventType;
  category: SportEventCategory | null;
  status: SportEventStatus;
  description: string | null;
  schedules?: EventSchedule[];
  matches?: Match[];
  _count?: { matches: number; placements: number; tabulators: number };
};

export type SportEventDetail = SportEvent & {
  season: Season;
  matches: Match[];
  schedules: EventSchedule[];
  placements: EventPlacement[];
  eventTeams: EventTeamEntry[];
  tabulators: { id: string; userId: string; user: { id: string; name: string; email: string } }[];
};

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";

export type Match = {
  id: string;
  sportEventId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  winnerTeamId: string | null;
  scheduledAt: string;
  venue: string | null;
  homeTeam: Team;
  awayTeam: Team;
  winnerTeam: Team | null;
  sportEvent?: SportEvent;
};

export type EventPlacement = {
  id: string;
  sportEventId: string;
  teamId: string;
  placement: number;
  points: number;
  team: Team;
};

export type PlacementPointsRule = {
  id: string;
  seasonId: string;
  placement: number;
  points: number;
};

export type StandingRow = {
  team: Team;
  totalPoints: number;
};
