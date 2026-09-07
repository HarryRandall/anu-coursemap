import type { CampusIndoorDocument } from "@/lib/rooms/indoor-map";

/**
 * Checks an indoor document for the problems an author can fix before
 * publishing. Errors block publishing; warnings are listed but allowed. Pure,
 * so the editor, the tests and any server gate can share one definition.
 */
export type IndoorIssueSeverity = "error" | "warning";

export type IndoorIssueTarget = Readonly<{
  kind: "space" | "wall" | "connector" | "opening" | "route-node" | "level";
  id: string;
}>;

export type IndoorIssue = Readonly<{
  /** Stable per document, so the issues list does not reorder as you fix it. */
  id: string;
  code: IndoorIssueCode;
  severity: IndoorIssueSeverity;
  message: string;
  levelId?: string;
  target?: IndoorIssueTarget;
}>;

export type IndoorIssueCode = "no-levels" | "no-entrance" | "room-without-door";

function roomLabel(
  space: Readonly<{ ref: string; name: string }>,
  fallback = "Room",
) {
  return space.ref
    ? `${space.ref}${space.name ? ` · ${space.name}` : ""}`
    : space.name || fallback;
}

export function validateIndoorDocument(
  document: CampusIndoorDocument,
): readonly IndoorIssue[] {
  const issues: IndoorIssue[] = [];

  if (document.levels.length === 0) {
    issues.push({
      id: "no-levels",
      code: "no-levels",
      severity: "error",
      message: "Add a floor before publishing.",
    });
    return issues;
  }

  const hasEntrance = document.walls.some((wall) =>
    wall.openings.some((opening) => opening.exterior),
  );
  if (!hasEntrance) {
    issues.push({
      id: "no-entrance",
      code: "no-entrance",
      severity: "error",
      message: "Add a door on an outside wall so people can be routed in.",
    });
  }

  const served = new Set(
    document.walls.flatMap((wall) =>
      wall.openings.flatMap((opening) =>
        opening.spaceId ? [opening.spaceId] : [],
      ),
    ),
  );
  for (const space of document.spaces) {
    if (space.kind !== "room" || !space.searchable || served.has(space.id)) {
      continue;
    }
    issues.push({
      id: `room-without-door:${space.id}`,
      code: "room-without-door",
      severity: "warning",
      message: `${roomLabel(space)} has no door, so it cannot be routed to.`,
      levelId: space.levelId,
      target: { kind: "space", id: space.id },
    });
  }

  return issues;
}

/** The first error's message, or null when nothing blocks publishing. */
export function publishBlockedMessage(
  issues: readonly IndoorIssue[],
): string | null {
  return issues.find((issue) => issue.severity === "error")?.message ?? null;
}
