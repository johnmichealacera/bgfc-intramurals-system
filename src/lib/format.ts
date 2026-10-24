import type { SportEventCategory, SportEventType } from "@/lib/types";

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

export const format = {
  date(value: string | Date) {
    return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  },
  dateTime(value: string | Date) {
    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  },
  time(value: string | Date) {
    return new Date(value).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  },
};
