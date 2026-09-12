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
