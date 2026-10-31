import type { EventScheduleScore, SportEventCategory, SportEventType } from "@/lib/types";

const EVENT_CATEGORY_LABELS: Record<SportEventCategory, string> = {
  MEN: "Men's",
  WOMEN: "Women's",
  MIXED: "Mixed",
};

export function eventCategoryLabel(category: SportEventCategory | null | undefined) {
  return category ? EVENT_CATEGORY_LABELS[category] : null;
}

export function eventTypeLabel(type: SportEventType) {
  return type === "TEAM_VS_TEAM" ? "Group" : "Solo";
}

export function sessionSides(scores: EventScheduleScore[] | undefined) {
  const rows = scores ?? [];
  return { home: rows[0], away: rows[1] };
}

export function sessionVsLabel(scores: EventScheduleScore[] | undefined, fallback = "Solo session") {
  const rows = scores ?? [];
  if (rows.length >= 3) return rows.map((row) => row.team.name).join(" · ");
  const { home, away } = sessionSides(scores);
  if (home && away) return `${home.team.name} vs ${away.team.name}`;
  if (home) return home.team.name;
  return fallback;
}

export function sessionScoreLine(scores: EventScheduleScore[] | undefined) {
  const rows = scores ?? [];
  if (rows.length === 2) return `${rows[0].score} – ${rows[1].score}`;
  if (rows.length > 2) return rows.map((row) => `${row.team.name} ${row.score}`).join(" · ");
  return null;
}

const PH_DATE: Intl.DateTimeFormatOptions = { timeZone: "Asia/Manila" };

export const format = {
  date(value: string | Date) {
    return new Date(value).toLocaleDateString("en-PH", { ...PH_DATE, year: "numeric", month: "short", day: "numeric" });
  },
  dateTime(value: string | Date) {
    return new Date(value).toLocaleString("en-PH", {
      ...PH_DATE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  },
  time(value: string | Date) {
    return new Date(value).toLocaleTimeString("en-PH", { ...PH_DATE, hour: "numeric", minute: "2-digit" });
  },
};
