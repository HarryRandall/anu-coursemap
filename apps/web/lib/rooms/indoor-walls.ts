import type {
  CampusIndoorWall,
  CampusIndoorWallOpening,
  IndoorPoint,
} from "@/lib/rooms/indoor-map";

/**
 * One drawn wall run reduced to the pairs of points a renderer or a hit test
 * walks. A closed wall adds the segment joining its last point back to its
 * first.
 */
export type IndoorWallSegment = Readonly<{
  index: number;
  start: IndoorPoint;
  end: IndoorPoint;
}>;

export type IndoorWallProjection = Readonly<{
  point: IndoorPoint;
  segmentIndex: number;
  offset: number;
  distance: number;
}>;

/** A wall polyline without its openings, which is all most maths needs. */
type WallShape = Readonly<{
  points: readonly IndoorPoint[];
  closed: boolean;
}>;

export function wallSegmentCount(wall: WallShape) {
  if (wall.points.length < 2) return 0;
  return wall.closed ? wall.points.length : wall.points.length - 1;
}

export function wallSegments(wall: WallShape): readonly IndoorWallSegment[] {
  const count = wallSegmentCount(wall);
  return Array.from({ length: count }, (_unused, index) => ({
    index,
    start: wall.points[index],
    end: wall.points[(index + 1) % wall.points.length],
  }));
}

function segmentLength(segment: IndoorWallSegment) {
  return Math.hypot(
    segment.end.x - segment.start.x,
    segment.end.y - segment.start.y,
  );
}

export function wallSegmentLength(wall: WallShape, segmentIndex: number) {
  const segments = wallSegments(wall);
  const segment = segments[segmentIndex];
  if (!segment) {
    throw new RangeError(
      `Wall segment ${segmentIndex} is outside a wall with ${segments.length} segments.`,
    );
  }
  return segmentLength(segment);
}

export function wallLength(wall: WallShape) {
  return wallSegments(wall).reduce(
    (total, segment) => total + segmentLength(segment),
    0,
  );
}

function pointAlong(segment: IndoorWallSegment, offset: number): IndoorPoint {
  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * offset,
    y: segment.start.y + (segment.end.y - segment.start.y) * offset,
  };
}

/** Centre of an opening in local coordinates. */
export function openingPoint(
  wall: WallShape,
  opening: Pick<CampusIndoorWallOpening, "segmentIndex" | "offset">,
): IndoorPoint {
  const segments = wallSegments(wall);
  const segment = segments[opening.segmentIndex];
  if (!segment) {
    throw new RangeError(
      `Wall opening sits on segment ${opening.segmentIndex}, outside a wall with ${segments.length} segments.`,
    );
  }
  return pointAlong(segment, opening.offset);
}

/**
 * Unit normal of the segment an opening sits on. Offsetting the opening centre
 * along this is how the editor decides which room a door serves.
 */
export function openingNormal(
  wall: WallShape,
  opening: Pick<CampusIndoorWallOpening, "segmentIndex">,
): IndoorPoint {
  const segments = wallSegments(wall);
  const segment = segments[opening.segmentIndex];
  if (!segment) {
    throw new RangeError(
      `Wall opening sits on segment ${opening.segmentIndex}, outside a wall with ${segments.length} segments.`,
    );
  }
  const length = segmentLength(segment);
  if (length === 0) return { x: 0, y: 0 };
  return {
    x: -(segment.end.y - segment.start.y) / length,
    y: (segment.end.x - segment.start.x) / length,
  };
}

/** The two ends of the gap, along the wall. */
export function openingEndpoints(
  wall: WallShape,
  opening: Pick<CampusIndoorWallOpening, "segmentIndex" | "offset" | "width">,
): readonly [IndoorPoint, IndoorPoint] {
  const segments = wallSegments(wall);
  const segment = segments[opening.segmentIndex];
  if (!segment) {
    throw new RangeError(
      `Wall opening sits on segment ${opening.segmentIndex}, outside a wall with ${segments.length} segments.`,
    );
  }
  const length = segmentLength(segment);
  const centre = pointAlong(segment, opening.offset);
  if (length === 0) return [centre, centre];

  const halfOffset = opening.width / 2 / length;
  return [
    pointAlong(segment, Math.max(0, opening.offset - halfOffset)),
    pointAlong(segment, Math.min(1, opening.offset + halfOffset)),
  ];
}

/**
 * The pair of points just clear of the wall on either side of an opening. The
 * editor point-in-polygon tests these to work out which room a door serves and
 * whether the far side is outside the building.
 */
export function openingSides(
  wall: Pick<CampusIndoorWall, "points" | "closed" | "thickness">,
  opening: Pick<CampusIndoorWallOpening, "segmentIndex" | "offset">,
  clearance = wall.thickness,
): readonly [IndoorPoint, IndoorPoint] {
  const centre = openingPoint(wall, opening);
  const normal = openingNormal(wall, opening);
  return [
    { x: centre.x + normal.x * clearance, y: centre.y + normal.y * clearance },
    { x: centre.x - normal.x * clearance, y: centre.y - normal.y * clearance },
  ];
}

function closestOnSegment(segment: IndoorWallSegment, point: IndoorPoint) {
  const deltaX = segment.end.x - segment.start.x;
  const deltaY = segment.end.y - segment.start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const offset =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - segment.start.x) * deltaX +
              (point.y - segment.start.y) * deltaY) /
              lengthSquared,
          ),
        );
  const projected = pointAlong(segment, offset);
  return {
    point: projected,
    offset,
    distance: Math.hypot(point.x - projected.x, point.y - projected.y),
  };
}

/** Nearest point on a wall, used for snapping and for placing an opening. */
export function closestPointOnWall(
  wall: WallShape,
  point: IndoorPoint,
): IndoorWallProjection | null {
  const segments = wallSegments(wall);
  if (segments.length === 0) return null;

  let best: IndoorWallProjection | null = null;
  for (const segment of segments) {
    const candidate = closestOnSegment(segment, point);
    if (!best || candidate.distance < best.distance) {
      best = { ...candidate, segmentIndex: segment.index };
    }
  }
  return best;
}

/**
 * Keeps an opening inside the segment it sits on. Widths are absolute, so an
 * edit that shortens a segment has to narrow whatever was drawn across it.
 */
function fitOpeningToSegment(
  wall: WallShape,
  opening: CampusIndoorWallOpening,
): CampusIndoorWallOpening {
  const length = wallSegmentLength(wall, opening.segmentIndex);
  const width = Math.min(opening.width, length);
  const halfOffset = length === 0 ? 0 : width / 2 / length;
  return {
    ...opening,
    width,
    offset: Math.min(1 - halfOffset, Math.max(halfOffset, opening.offset)),
  };
}

export function moveWallVertex(
  wall: CampusIndoorWall,
  index: number,
  point: IndoorPoint,
): CampusIndoorWall {
  if (!Number.isInteger(index) || index < 0 || index >= wall.points.length) {
    throw new RangeError(
      `Wall vertex ${index} is outside a wall with ${wall.points.length} points.`,
    );
  }
  const next: CampusIndoorWall = {
    ...wall,
    points: wall.points.map((existing, existingIndex) =>
      existingIndex === index ? { x: point.x, y: point.y } : existing,
    ),
  };
  // Openings keep the segment they were drawn on and their share of it, so
  // dragging a corner slides its doors rather than teleporting them.
  return {
    ...next,
    openings: next.openings.map((opening) =>
      fitOpeningToSegment(next, opening),
    ),
  };
}

/**
 * Splits one segment in two at `point`, which is projected onto the segment so
 * the wall keeps its shape. Openings on the split segment are reassigned to
 * whichever half now contains them.
 */
export function insertWallVertex(
  wall: CampusIndoorWall,
  segmentIndex: number,
  point: IndoorPoint,
): CampusIndoorWall {
  const segments = wallSegments(wall);
  const segment = segments[segmentIndex];
  if (!segment) {
    throw new RangeError(
      `Wall segment ${segmentIndex} is outside a wall with ${segments.length} segments.`,
    );
  }

  const { point: projected, offset: split } = closestOnSegment(segment, point);
  const points = [
    ...wall.points.slice(0, segmentIndex + 1),
    projected,
    ...wall.points.slice(segmentIndex + 1),
  ];

  const openings = wall.openings.map((opening) => {
    if (opening.segmentIndex < segmentIndex) return opening;
    if (opening.segmentIndex > segmentIndex) {
      return { ...opening, segmentIndex: opening.segmentIndex + 1 };
    }
    // A degenerate split leaves the opening on the half that still has length.
    if (split <= 0) return { ...opening, segmentIndex: segmentIndex + 1 };
    if (split >= 1) return opening;
    return opening.offset <= split
      ? { ...opening, offset: opening.offset / split }
      : {
          ...opening,
          segmentIndex: segmentIndex + 1,
          offset: (opening.offset - split) / (1 - split),
        };
  });

  const next = { ...wall, points };
  return {
    ...next,
    openings: openings.map((opening) => fitOpeningToSegment(next, opening)),
  };
}

/**
 * Removes one vertex, merging the segments either side of it. Openings are
 * re-projected from where they physically sat, so a door stays on the wall
 * rather than jumping to a different share of a longer segment. An opening on a
 * segment that disappears entirely is dropped.
 */
export function removeWallVertex(
  wall: CampusIndoorWall,
  index: number,
): CampusIndoorWall {
  if (!Number.isInteger(index) || index < 0 || index >= wall.points.length) {
    throw new RangeError(
      `Wall vertex ${index} is outside a wall with ${wall.points.length} points.`,
    );
  }
  const minimumPoints = wall.closed ? 4 : 3;
  if (wall.points.length < minimumPoints) {
    throw new RangeError(
      `Removing a vertex would leave a ${wall.closed ? "closed" : "open"} wall with fewer than ${minimumPoints - 1} points.`,
    );
  }

  const anchors = wall.openings.map((opening) => ({
    opening,
    point: openingPoint(wall, opening),
  }));
  const next: CampusIndoorWall = {
    ...wall,
    points: wall.points.filter((_unused, pointIndex) => pointIndex !== index),
  };

  return {
    ...next,
    openings: anchors.flatMap(({ opening, point }) => {
      const projection = closestPointOnWall(next, point);
      if (!projection) return [];
      return [
        fitOpeningToSegment(next, {
          ...opening,
          segmentIndex: projection.segmentIndex,
          offset: projection.offset,
        }),
      ];
    }),
  };
}
