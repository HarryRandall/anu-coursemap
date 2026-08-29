import type { CourseDetails } from "@/lib/coursemap/course-types";

const accents: CourseDetails["accent"][] = [
  "blue",
  "violet",
  "mint",
  "amber",
  "rose",
  "cyan",
];

/** Stable per-code accent so a course keeps the same colour everywhere. */
export function accentFor(code: string): CourseDetails["accent"] {
  const sum = [...code].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return accents[sum % accents.length];
}
