import type { Tone } from "@/lib/ui";
import type { CampusIndoorMapStatus } from "@/lib/rooms/indoor-map-admin";

/**
 * Tone for an indoor map's publication status. Distinct from the plan status
 * tones in `lib/ui`, which describe a student's progress through a course.
 */
export function indoorMapStatusTone(status: CampusIndoorMapStatus): Tone {
  if (status === "published") return "success";
  if (status === "archived") return "neutral";
  return "warning";
}

export function formatIndoorMapUpdatedAt(value: string | null) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved previously";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}
