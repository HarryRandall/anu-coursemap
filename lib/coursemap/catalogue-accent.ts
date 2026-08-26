import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";

const accents: CatalogueCourse["accent"][] = [
  "blue",
  "violet",
  "mint",
  "amber",
  "rose",
  "cyan",
];

/** Stable per-code accent so a course keeps the same colour everywhere. */
export function accentFor(code: string): CatalogueCourse["accent"] {
  const sum = [...code].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return accents[sum % accents.length];
}
