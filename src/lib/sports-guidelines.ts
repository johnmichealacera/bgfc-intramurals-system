import type { SportEventType } from "@/lib/types";

export type GuidelineSection = {
  heading: string;
  items: string[];
};

export type SportGuideline = {
  slug: string;
  name: string;
  category: "Team Sport" | "Individual Sport";
  suggestedEventType: SportEventType;
  governingBody: string;
  overview: string;
  sections: GuidelineSection[];
};

/**
 * Condensed from the PRISAA National Games governing guidelines. Full legal/technical
 * rule text (e.g. the complete FIG Code of Points) is intentionally summarized to what an
 * organizer or tabulator needs operationally — each sport still names its governing body
 * so the authoritative source can be consulted for edge cases.
 */
export const SPORTS_GUIDELINES: SportGuideline[] = [
  {
    slug: "basketball",
    name: "Basketball",
    category: "Team Sport",
    suggestedEventType: "TEAM_VS_TEAM",
    governingBody: "FIBA rules, as modified by PRISAA Games Rules",
    overview:
      "5-on-5 team competition. Divisions: Men's, Women's, Boys', Girls'. Only one team entry per division per delegation.",
    sections: [
      {
        heading: "Team composition",
        items: [
          "12 players and 5 team officials: Head Coach, Assistant Coach/Trainer, 2 Technical Staff, Team Manager.",
          "Uniform numbers 1–99; a player's registered number stays the same for the whole tournament.",
        ],
      },
      {
        heading: "Tournament format",
        items: [
          "8+ teams: split into Group A/B, single round robin, top 2 per group advance to a cross-over semi-final.",
          "Losers of the semi-final play for 3rd/4th place; winners play for 1st/2nd.",
          "12+ teams: grouping follows the general ground rules for larger fields.",
        ],
      },
      {
        heading: "Breaking ties",
        items: [
          "3+ way tie: FIBA quotient system.",
          "Tie across different groups: ranked by total points scored across the series.",
          "Simple 2-way tie: win-over-the-other rule — no playoff game.",
        ],
      },
      {
        heading: "Conduct & discipline",
        items: [
          "No smoking, alcohol, firearms/weapons, or players/coaches under the influence of drugs.",
          "Only the head coach may stand during play.",
          "2 unsportsmanlike acts by a player, or 3 indirect technical fouls by a coach, means disqualification from the game (plus a 1-game suspension on the next scheduled game).",
          "\"No Coach No Play\" and \"No ID No Play\" apply throughout.",
          "An unidentifiable free-for-all results in both teams losing the game and being banned from the tournament.",
        ],
      },
      {
        heading: "Awards",
        items: [
          "Champion — gold medals & certificate. 1st Runner-up — silver. 2nd Runner-up — bronze.",
          "Mythical Five (2 Forward, 1 Center, 2 Guard), Best Coach, and MVP per division.",
        ],
      },
    ],
  },
  {
    slug: "volleyball",
    name: "Volleyball",
    category: "Team Sport",
    suggestedEventType: "TEAM_VS_TEAM",
    governingBody: "FIVB Official Rules (2025–2028)",
    overview: "6-on-6 team competition, played in best-of-5 sets.",
    sections: [
      {
        heading: "Team composition",
        items: [
          "Up to 14 players; 2 Liberos are compulsory once the roster exceeds 12.",
          "Up to 4 bench officials: Head Coach, 2 Assistant Coaches, Team Therapist.",
          "Uniform numbers 1–20; the Libero must wear a contrasting color.",
        ],
      },
      {
        heading: "Match format",
        items: [
          "Best of 5 sets, first to 25 points (win by 2). A deciding 5th set is played to 15 points, switching courts at 8.",
        ],
      },
      {
        heading: "Team classification & tie-breaks",
        items: [
          "Primary ranking is by number of matches won.",
          "Match points: 3–0/3–1 win = 3 pts, 3–2 win = 2 pts, 2–3 loss = 1 pt, 0–3/1–3 loss = 0 pts, forfeit = 0 pts.",
          "Ties broken by set quotient, then point quotient, then head-to-head result.",
        ],
      },
      {
        heading: "Tournament format",
        items: [
          "Under 8 teams: single round robin, top 4 to semis (1v4, 2v3).",
          "8–10 teams: 2 groups (seeded by prior year's results), top 2 per group cross over to semis.",
          "Over 10 teams: organizer designs an appropriate format.",
          "A 15-minute grace period applies to the first match of the day; interrupted matches resume from the same score.",
        ],
      },
      {
        heading: "Conduct & officiating",
        items: [
          "Coaches must wear a collared shirt, long pants, and proper shoes; vulgar language is not tolerated.",
          "Only PNVF-accredited/licensed referees may officiate.",
        ],
      },
      {
        heading: "Awards",
        items: ["Top 3 finishers per division receive a trophy and certificates; Best Players are also recognized."],
      },
    ],
  },
  {
    slug: "athletics",
    name: "Athletics",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "World Athletics Technical Rules",
    overview:
      "Track & field program covering sprints, distance runs, hurdles, relays, jumps, and throws for Men's and Women's divisions.",
    sections: [
      {
        heading: "Entries",
        items: [
          "Up to 2 athletes per delegation per individual event (3 for long-distance events), 1 team per relay.",
          "An athlete may compete in up to 3 individual events plus 2 relays.",
          "An athlete who no-shows an entered event may not compete in later events (law of succession).",
        ],
      },
      {
        heading: "Conduct on the day",
        items: [
          "Competitors report to the roll call area 30 minutes before their event, in official uniform with their assigned number front and back.",
          "No coach or other party may be inside the field-of-play vicinity — 1st violation is a warning card, 2nd disqualifies the athlete.",
          "Weather-related postponement/cancellation is decided by majority vote of coaches, in consultation with the Technical Management.",
        ],
      },
      {
        heading: "Field event standards",
        items: [
          "Starting bar heights and throwing implement weights are set per age/gender division (see World Athletics / PATAFA technical tables).",
          "No medals are awarded for an event that couldn't be played.",
        ],
      },
      {
        heading: "Awards",
        items: [
          "Individual & relay events: Gold / Silver / Bronze medals for 1st / 2nd / 3rd place.",
          "Team standings: certificates for 1st / 2nd / 3rd place.",
        ],
      },
    ],
  },
  {
    slug: "swimming",
    name: "Swimming",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "World Aquatics (FINA) Swimming Rules",
    overview: "Timed-finals competition across freestyle, backstroke, breaststroke, butterfly, medley, and relay events.",
    sections: [
      {
        heading: "Entries & team size",
        items: [
          "Up to 2 swimmers per individual event, 1 relay team per relay event.",
          "A swimmer may compete in up to 5 individual events plus 2 relays.",
          "Team size: 12 men and 12 women per delegation.",
        ],
      },
      {
        heading: "Format",
        items: [
          "One-start rule; results decided by timed finals (no separate heats/finals rounds).",
          "A swimmer who fails to swim an entered event is barred from the rest of that session's events, unless excused by an accredited medical certificate.",
        ],
      },
      {
        heading: "Most Outstanding Swimmer",
        items: [
          "Ranked by most individual gold medals; ties broken by silvers won, then bronzes, then next-highest individual placing.",
        ],
      },
    ],
  },
  {
    slug: "badminton",
    name: "Badminton",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "BWF (Badminton World Federation) scoring rules",
    overview: "Team tie competition plus individual singles, doubles, and mixed doubles events.",
    sections: [
      {
        heading: "Team ties",
        items: [
          "4 players per team; order of play is Single–Double–Single (SDS).",
          "Best-of-three ties; team composition submitted to match control 15 minutes before play, no substitutions once the tie starts.",
        ],
      },
      {
        heading: "Individual events",
        items: [
          "Up to 2 entries per region for Singles, 1 pair for Doubles, 1 pair for Mixed Doubles.",
        ],
      },
      {
        heading: "Scoring & walkovers",
        items: [
          "BWF scoring: rally point system to 21, best-of-three games.",
          "A 10-minute grace period applies; failure to appear results in a walkover loss.",
        ],
      },
      {
        heading: "Breaking ties",
        items: ["Matches won/lost → games won/lost → points won/lost → draw of lots."],
      },
    ],
  },
  {
    slug: "chess",
    name: "Chess",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "FIDE Laws of Chess",
    overview: "Board team event played under the Swiss System.",
    sections: [
      {
        heading: "Team composition",
        items: [
          "4 regular board players per team, plus 1 coach; the board lineup is locked in after the technical/solidarity meeting.",
        ],
      },
      {
        heading: "Format & time control",
        items: [
          "7-round straight Swiss System.",
          "90 minutes + 30-second increment per move, using a DGT chess clock (mandatory).",
          "Win = 1 point, draw = ½ point, loss = 0; a team's round score is the sum of all 4 boards.",
        ],
      },
      {
        heading: "Tie-breaks",
        items: [
          "Team: match points (win ≥2½ boards = 4 pts, tie 2 pts, loss ≤1½ = 1 pt) → best individual board results from Board 2 down → Sonneborn-Berger.",
          "Individual: win-over-the-other / direct encounter, then fewer games played.",
        ],
      },
      {
        heading: "Conduct & discipline",
        items: [
          "No ID, no play. Mobile phones must be off; use/ringing forfeits the game.",
          "A player who no-shows past a 30-minute grace period defaults the game.",
          "Illegal moves and infringements carry escalating penalties (time added, then loss of game).",
        ],
      },
      {
        heading: "Awards",
        items: ["Top 3 teams receive Gold/Silver/Bronze medals and certificates; all participants get a Certificate of Participation."],
      },
    ],
  },
  {
    slug: "dancesport",
    name: "Dancesport",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "World DanceSport Federation (WDSF)",
    overview:
      "Modern Standard and Latin American style competitions (5 dances each), plus 10 individual single-dance events, for Senior division couples.",
    sections: [
      {
        heading: "Events",
        items: [
          "Grade A Modern Standard: Waltz, Tango, Viennese Waltz, Foxtrot, Quickstep.",
          "Grade A Latin American: Samba, Cha-cha-cha, Rumba, Paso Doble, Jive.",
          "Each of the 10 dances above is also contested as its own Single Dance event.",
        ],
      },
      {
        heading: "Competition rounds",
        items: [
          "Grade A (5-dance) events run through elimination rounds: First Round → Quarter-Final (24 couples) → Semi-Final (12) → Final (6).",
          "Single Dance events are open only to the 6 finalists from the Grade A elimination rounds.",
        ],
      },
      {
        heading: "Judging",
        items: ["WDSF Absolute Judging System (AJS) or Skating System, per competition level."],
      },
      {
        heading: "Rules",
        items: [
          "Each school sends 2 couples for Latin and 2 for Standard per division.",
          "No change of partners once a couple has qualified through to Nationals.",
        ],
      },
    ],
  },
  {
    slug: "table-tennis",
    name: "Table Tennis",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "ITTF Laws, as modified by PRISAA Games Rules",
    overview: "Team event plus singles, doubles, and mixed doubles individual events.",
    sections: [
      {
        heading: "Team event",
        items: [
          "Up to 4 players per team; match order is 1st Singles – Doubles – 2nd Singles (SDS), best-of-five games per match.",
          "A team with only 3 players automatically forfeits the 1st singles; a team with only 2 players cannot join the team event.",
        ],
      },
      {
        heading: "Individual events",
        items: [
          "Up to 2 entries per region for Singles; 1 pair per region for Doubles and Mixed Doubles.",
          "Singles players may not also play Doubles; violators forfeit their individual-event matches.",
        ],
      },
      {
        heading: "Tournament format",
        items: [
          "Teams are grouped and play single round robin within group, then cross-over semi-finals, then a final stage for placings.",
        ],
      },
      {
        heading: "Equipment",
        items: ["Official ball: white, 40+mm diameter, 3-star. Rackets must conform to the current ITTF list of authorized coverings."],
      },
    ],
  },
  {
    slug: "gymnastics",
    name: "Gymnastics",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "FIG (Fédération Internationale de Gymnastique) Code of Points",
    overview:
      "Covers four disciplines — Men's Artistic, Women's Artistic, Aerobic, and Rhythmic Gymnastics — each scored under its own FIG Code of Points.",
    sections: [
      {
        heading: "Scoring model",
        items: [
          "Every discipline scores routines as Difficulty (D-score) + Execution (E-score) = Final Score, per the applicable FIG Code of Points cycle.",
          "A gymnast may compete in only one discipline.",
        ],
      },
      {
        heading: "Apparatus finals",
        items: [
          "The top 8 per event (max. 2–3 gymnasts per region) advance to Apparatus/Event Finals; 2 alternates stand by for injury/illness substitutions.",
        ],
      },
      {
        heading: "All-Around & team ranking",
        items: [
          "Individual All-Around is ranked by total score across all apparatus/events for that discipline.",
          "Team ranking sums each region's best individual placings; ties are broken per FIG tie-break rules (execution score, then artistic, then difficulty).",
        ],
      },
      {
        heading: "Conduct",
        items: [
          "Coaches may be issued yellow/red cards for disruptive behavior or improper coaching contact during a routine.",
          "Flash photography is not allowed during competition.",
        ],
      },
      {
        heading: "Awards",
        items: ["Gold/Silver/Bronze medals and certificates for the top 3 in each individual and team event; Certificate of Participation for all."],
      },
    ],
  },
  {
    slug: "billiards",
    name: "Billiards",
    category: "Individual Sport",
    suggestedEventType: "PLACEMENT",
    governingBody: "World Pool Association (WPA) rules, as adopted by PRISAA",
    overview: "Cue sports competition contested as 9-ball and 8-ball singles.",
    sections: [
      {
        heading: "Team composition",
        items: ["2 players each for Men's/Boys' and Women's/Girls' categories, plus up to 2 coaches per delegation."],
      },
      {
        heading: "Equipment & attire",
        items: [
          "Players bring their own cue stick, chalk, gloves, powder, and tapper.",
          "Delegation uniform (slacks/jogging pants + polo/shirt) and ID required to play.",
        ],
      },
      {
        heading: "Play rules",
        items: [
          "9-ball: balls played in ascending order; the three-point break rule governs a legal break.",
          "8-ball: shooter must clear their group of 7 before legally potting the 8-ball; shots are called.",
          "40-second shot clock with one 30-second extension per inning; one 5-minute time-out per player per match.",
          "No communication between coach and player during a match; coaches keep their distance.",
        ],
      },
      {
        heading: "Tournament format",
        items: [
          "12+ teams: 4 brackets, round robin then cross-over quarter-finals → semis → final.",
          "6–11 teams: 2 brackets, round robin then cross-over semis → final.",
          "3–5 teams: single round robin, then a championship/bronze match. 2 teams: best-of-three.",
          "Race format: Elimination/Quarter-Finals = race to 3. Semi-Finals/Championship = race to 5.",
        ],
      },
    ],
  },
];

/** Matches an event name like "Men's Basketball" back to the "Basketball" guideline entry, if any. */
export function findGuidelineForEventName(eventName: string): SportGuideline | undefined {
  const normalized = eventName.toLowerCase();
  return SPORTS_GUIDELINES.find((s) => normalized.includes(s.name.toLowerCase()));
}

/** National-games contingent quota per sport (M/W/C columns as published in the source guidelines). */
export const SPORTS_COMPOSITION = {
  team: [
    { sport: "Basketball (5x5)", m: 12, w: 12, c: 4, total: 56 },
    { sport: "Volleyball", m: 14, w: 14, c: 4, total: 64 },
  ],
  individual: [
    { sport: "Athletics", m: 18, w: 16, c: 4, total: 76 },
    { sport: "Badminton", m: 4, w: 4, c: 2, total: 20 },
    { sport: "Chess", m: 4, w: 4, c: 2, total: 20 },
    { sport: "Dancesport", m: 4, w: 4, c: 2, total: 20 },
    { sport: "Swimming", m: 12, w: 12, c: 4, total: 80 },
    { sport: "Table Tennis", m: 4, w: 4, c: 2, total: 20 },
    { sport: "Gymnastics", m: 5, w: 8, c: 4, total: 34 },
    { sport: "Billiards", m: 2, w: 2, c: 2, total: 12 },
  ],
};

/** Modified medal count (Gold/Silver/Bronze) to encourage broader participation across regions. */
export const MODIFIED_MEDAL_COUNT = [
  { category: "Basketball", gold: 5, silver: 5, bronze: 5 },
  { category: "Volleyball", gold: 6, silver: 6, bronze: 6 },
  { category: "Badminton (team)", gold: 4, silver: 4, bronze: 4 },
  { category: "Chess (team)", gold: 4, silver: 4, bronze: 4 },
  { category: "Dancesport (team)", gold: 4, silver: 4, bronze: 4 },
  { category: "Table Tennis (team)", gold: 4, silver: 4, bronze: 4 },
  { category: "Individual events", gold: 1, silver: 1, bronze: 1 },
  { category: "Doubles / Mixed Doubles", gold: 2, silver: 2, bronze: 2 },
  { category: "Relays", gold: 4, silver: 4, bronze: 4 },
];
