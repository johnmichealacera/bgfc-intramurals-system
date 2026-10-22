import { eventCategoryLabel } from "@/lib/format";
import type { Participant, SportEventCategory } from "@/lib/types";

export const MAX_EVENT_ENTRIES = 3;

export type EnrollmentEvent = {
  id: string;
  name: string;
  category: SportEventCategory | null;
};

function eventLabel(event: EnrollmentEvent) {
  const category = eventCategoryLabel(event.category);
  return category ? `${event.name} (${category})` : event.name;
}

export function getEnrollmentBlockReason(
  participant: Pick<Participant, "gender" | "eventEntries">,
  event: EnrollmentEvent,
): string | null {
  const entries = participant.eventEntries ?? [];
  if (entries.some((entry) => entry.eventTeam.sportEvent.id === event.id)) {
    return "Already entered in this event.";
  }

  if (entries.length >= MAX_EVENT_ENTRIES) {
    return `Reached the ${MAX_EVENT_ENTRIES}-event limit per player.`;
  }

  if (event.category === "MEN" && participant.gender === "FEMALE") {
    return `Cannot enter ${eventLabel(event)} — this player is registered as female.`;
  }
  if (event.category === "WOMEN" && participant.gender === "MALE") {
    return `Cannot enter ${eventLabel(event)} — this player is registered as male.`;
  }

  if (event.category === "MEN" || event.category === "WOMEN") {
    const opposite = event.category === "MEN" ? "WOMEN" : "MEN";
    const conflict = entries.find((entry) => entry.eventTeam.sportEvent.category === opposite);
    if (conflict) {
      return `Already entered in ${eventLabel(conflict.eventTeam.sportEvent)} — cannot also enter a ${eventCategoryLabel(event.category)} event.`;
    }
  }

  return null;
}
