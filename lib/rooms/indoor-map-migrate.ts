import {
  CAMPUS_INDOOR_DOCUMENT_VERSION,
  parseCampusIndoorDocument,
  type CampusIndoorDocument,
} from "@/lib/rooms/indoor-map";

/**
 * Default perimeter wall thickness for a migrated level, 0.2 m at ten local
 * units per metre.
 */
const MIGRATED_WALL_THICKNESS = 2;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== null
  );
}

function migrationError(message: string): never {
  throw new TypeError(`Invalid campus indoor document: ${message}.`);
}

/**
 * Draws a level's stored outline as a closed structural wall. Version 1 had no
 * wall primitive, so the outline is the only real geometry a migration can
 * recover. Interior walls are deliberately not inferred from room polygons:
 * neighbouring rooms share an edge and would each produce their own wall.
 */
function outlineWall(level: unknown, index: number) {
  if (!isPlainRecord(level)) {
    migrationError(`levels[${index}] is not an object`);
  }
  const { id, outline } = level;
  if (typeof id !== "string" || id.length === 0) {
    migrationError(`levels[${index}].id is not an identifier`);
  }
  if (!Array.isArray(outline) || outline.length < 3) {
    migrationError(`levels[${index}].outline is not a polygon`);
  }

  return {
    id: `wall-outline-${id}`,
    levelId: id,
    kind: "structural",
    points: outline.map((point) => {
      if (!isPlainRecord(point)) {
        migrationError(
          `levels[${index}].outline holds a point that is not an object`,
        );
      }
      return { x: point.x, y: point.y };
    }),
    thickness: MIGRATED_WALL_THICKNESS,
    closed: true,
    openings: [],
  };
}

/**
 * Brings a stored document up to the current version before it is parsed.
 *
 * This is deliberately separate from `parseCampusIndoorDocument`, which stays
 * strict and single-version: its key whitelists would become unreadable if they
 * had to describe two shapes at once. Read paths run this first; write paths
 * parse strictly so nothing old can be saved back.
 */
export function upgradeCampusIndoorDocument(value: unknown): unknown {
  if (!isPlainRecord(value)) return value;

  const version = value.version;
  if (version === CAMPUS_INDOOR_DOCUMENT_VERSION) return value;
  if (version !== 1) {
    migrationError(
      `version ${JSON.stringify(version)} cannot be upgraded to version ${CAMPUS_INDOOR_DOCUMENT_VERSION}`,
    );
  }

  const levels = value.levels;
  if (!Array.isArray(levels)) {
    migrationError("levels is not an array");
  }

  // `routingMode` is dropped: explicit authoring is the only behaviour now.
  // Authored route nodes and edges survive untouched, including version 1 door
  // nodes, which simply carry no `openingId`.
  const rest = { ...value };
  delete rest.routingMode;
  return {
    ...rest,
    version: CAMPUS_INDOOR_DOCUMENT_VERSION,
    walls: Array.isArray(value.walls)
      ? value.walls
      : levels.map((level, index) => outlineWall(level, index)),
  };
}

/**
 * Parses a document that may have been stored under an older version. Every
 * read path uses this; write paths call `parseCampusIndoorDocument` directly so
 * nothing outdated can be saved back.
 */
export function readCampusIndoorDocument(value: unknown): CampusIndoorDocument {
  return parseCampusIndoorDocument(upgradeCampusIndoorDocument(value));
}
