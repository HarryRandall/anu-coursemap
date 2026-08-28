import type {
  IndoorPoint,
  IndoorPolygonGeometry,
  IndoorSpaceGeometry,
} from "@/lib/rooms/indoor-map";

/**
 * Axis-aligned extent of a geometry in local units. The editor uses this for
 * selection outlines, resize handles and camera framing.
 */
export type IndoorBounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

function pointsEqual(left: IndoorPoint, right: IndoorPoint) {
  return left.x === right.x && left.y === right.y;
}

/**
 * Drops the repeated closing point some polygon sources emit so area and
 * centroid maths do not double-count a vertex.
 */
function normalisePolygonPoints(points: readonly IndoorPoint[]) {
  if (points.length > 3 && pointsEqual(points[0], points.at(-1)!)) {
    return points.slice(0, -1);
  }
  return points;
}

function squaredDistance(left: IndoorPoint, right: IndoorPoint) {
  const deltaX = right.x - left.x;
  const deltaY = right.y - left.y;
  return deltaX * deltaX + deltaY * deltaY;
}

const POLYGON_EPSILON = 1e-7;

type PointRingPosition = "inside" | "outside" | "boundary";

function crossVector(left: IndoorPoint, right: IndoorPoint) {
  return left.x * right.y - left.y * right.x;
}

function pointOnIndoorSegment(
  point: IndoorPoint,
  start: IndoorPoint,
  end: IndoorPoint,
) {
  const segment = { x: end.x - start.x, y: end.y - start.y };
  const offset = { x: point.x - start.x, y: point.y - start.y };
  const cross = crossVector(segment, offset);
  const tolerance =
    POLYGON_EPSILON * Math.max(1, Math.hypot(segment.x, segment.y));
  if (Math.abs(cross) > tolerance) return false;

  const projection = offset.x * segment.x + offset.y * segment.y;
  const lengthSquared = segment.x * segment.x + segment.y * segment.y;
  return (
    projection >= -POLYGON_EPSILON &&
    projection <= lengthSquared + POLYGON_EPSILON
  );
}

function pointInRing(
  point: IndoorPoint,
  source: readonly IndoorPoint[],
): PointRingPosition {
  const ring = normalisePolygonPoints(source);
  let inside = false;

  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];
    if (pointOnIndoorSegment(point, start, end)) return "boundary";

    const straddles = start.y > point.y !== end.y > point.y;
    if (!straddles) continue;
    const crossingX =
      start.x + ((point.y - start.y) / (end.y - start.y)) * (end.x - start.x);
    if (point.x < crossingX) inside = !inside;
  }

  return inside ? "inside" : "outside";
}

/**
 * Tests a point against a footprint exterior and its optional holes. The outer
 * perimeter is usable floor area, while a hole boundary is not.
 */
export function isIndoorPointWithinPolygon(
  point: IndoorPoint,
  exterior: readonly IndoorPoint[],
  holes: readonly (readonly IndoorPoint[])[] = [],
) {
  if (pointInRing(point, exterior) === "outside") return false;
  return holes.every((hole) => pointInRing(point, hole) === "outside");
}

function segmentRingIntersections(
  start: IndoorPoint,
  end: IndoorPoint,
  source: readonly IndoorPoint[],
) {
  const ring = normalisePolygonPoints(source);
  const direction = { x: end.x - start.x, y: end.y - start.y };
  const lengthSquared = direction.x * direction.x + direction.y * direction.y;
  const intersections: number[] = [];

  for (let index = 0; index < ring.length; index += 1) {
    const edgeStart = ring[index];
    const edgeEnd = ring[(index + 1) % ring.length];
    const edge = {
      x: edgeEnd.x - edgeStart.x,
      y: edgeEnd.y - edgeStart.y,
    };
    const offset = {
      x: edgeStart.x - start.x,
      y: edgeStart.y - start.y,
    };
    const denominator = crossVector(direction, edge);

    if (Math.abs(denominator) > POLYGON_EPSILON) {
      const progress = crossVector(offset, edge) / denominator;
      const edgeProgress = crossVector(offset, direction) / denominator;
      if (
        progress >= -POLYGON_EPSILON &&
        progress <= 1 + POLYGON_EPSILON &&
        edgeProgress >= -POLYGON_EPSILON &&
        edgeProgress <= 1 + POLYGON_EPSILON
      ) {
        intersections.push(Math.min(1, Math.max(0, progress)));
      }
      continue;
    }

    if (
      lengthSquared === 0 ||
      Math.abs(crossVector(offset, direction)) > POLYGON_EPSILON
    ) {
      continue;
    }

    const startProgress =
      (offset.x * direction.x + offset.y * direction.y) / lengthSquared;
    const edgeOffset = {
      x: edgeEnd.x - start.x,
      y: edgeEnd.y - start.y,
    };
    const endProgress =
      (edgeOffset.x * direction.x + edgeOffset.y * direction.y) / lengthSquared;
    const overlapStart = Math.max(0, Math.min(startProgress, endProgress));
    const overlapEnd = Math.min(1, Math.max(startProgress, endProgress));
    if (overlapStart <= overlapEnd + POLYGON_EPSILON) {
      intersections.push(overlapStart, overlapEnd);
    }
  }

  return intersections;
}

/**
 * A segment is contained only when every interval between its footprint-boundary
 * crossings is usable floor area. Checking interval midpoints handles concave
 * outlines and holes without assuming that endpoint containment is enough.
 */
export function isIndoorSegmentWithinPolygon(
  start: IndoorPoint,
  end: IndoorPoint,
  exterior: readonly IndoorPoint[],
  holes: readonly (readonly IndoorPoint[])[] = [],
) {
  if (
    !isIndoorPointWithinPolygon(start, exterior, holes) ||
    !isIndoorPointWithinPolygon(end, exterior, holes)
  ) {
    return false;
  }

  const progress = [
    0,
    1,
    ...segmentRingIntersections(start, end, exterior),
    ...holes.flatMap((hole) => segmentRingIntersections(start, end, hole)),
  ]
    .sort((left, right) => left - right)
    .filter(
      (value, index, values) =>
        index === 0 || Math.abs(value - values[index - 1]) > POLYGON_EPSILON,
    );

  for (let index = 0; index < progress.length - 1; index += 1) {
    const midpoint = (progress[index] + progress[index + 1]) / 2;
    const point = {
      x: start.x + (end.x - start.x) * midpoint,
      y: start.y + (end.y - start.y) * midpoint,
    };
    if (!isIndoorPointWithinPolygon(point, exterior, holes)) return false;
  }

  return true;
}

/** True when a complete closed ring stays within a footprint. */
export function isIndoorRingWithinPolygon(
  source: readonly IndoorPoint[],
  exterior: readonly IndoorPoint[],
  holes: readonly (readonly IndoorPoint[])[] = [],
) {
  const ring = normalisePolygonPoints(source);
  if (
    !ring.every((point, index) =>
      isIndoorSegmentWithinPolygon(
        point,
        ring[(index + 1) % ring.length],
        exterior,
        holes,
      ),
    )
  ) {
    return false;
  }

  // A void can sit wholly inside a large candidate ring without crossing any
  // candidate edge, so segment containment alone cannot see it.
  return holes.every((hole) => pointInRing(hole[0], ring) === "outside");
}

export function closestPointOnIndoorSegment(
  point: IndoorPoint,
  start: IndoorPoint,
  end: IndoorPoint,
): IndoorPoint {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return start;

  const progress = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        lengthSquared,
    ),
  );
  return {
    x: start.x + deltaX * progress,
    y: start.y + deltaY * progress,
  };
}

/**
 * Corner points of a rectangle in clockwise order. Rectangles are stored as an
 * origin and a size, so anything that walks edges needs them expanded first.
 */
function rectangleCorners(
  geometry: IndoorSpaceGeometry & { type: "rectangle" },
) {
  return [
    { x: geometry.x, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
    { x: geometry.x, y: geometry.y + geometry.height },
  ];
}

/**
 * Places a route entrance on the visible boundary of a room geometry. This
 * keeps room-to-path segments from ending at an arbitrary point outside the
 * room when an editor clicks near a wall.
 */
export function closestPointOnIndoorGeometryBoundary(
  geometry: IndoorSpaceGeometry,
  point: IndoorPoint,
): IndoorPoint {
  if (geometry.type === "ellipse") {
    const deltaX = point.x - geometry.cx;
    const deltaY = point.y - geometry.cy;
    if (deltaX === 0 && deltaY === 0) {
      return { x: geometry.cx + geometry.rx, y: geometry.cy };
    }
    const scale =
      1 /
      Math.sqrt(
        (deltaX * deltaX) / (geometry.rx * geometry.rx) +
          (deltaY * deltaY) / (geometry.ry * geometry.ry),
      );
    return {
      x: geometry.cx + deltaX * scale,
      y: geometry.cy + deltaY * scale,
    };
  }

  const points =
    geometry.type === "rectangle"
      ? rectangleCorners(geometry)
      : geometry.points;

  let closest = points[0];
  let closestDistance = Number.POSITIVE_INFINITY;
  points.forEach((start, index) => {
    const candidate = closestPointOnIndoorSegment(
      point,
      start,
      points[(index + 1) % points.length],
    );
    const distance = squaredDistance(point, candidate);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  });
  return closest;
}

/**
 * True centroid of a geometry. Polygons use the area-weighted centroid rather
 * than a vertex average, which a concave room skews towards whichever corner
 * carries the most vertices. Neither is guaranteed to land inside a concave
 * room, so callers that need an interior point must test with
 * {@link pointInIndoorGeometry} and fall back.
 */
export function indoorGeometryCentre(
  geometry: IndoorSpaceGeometry,
): IndoorPoint {
  if (geometry.type === "rectangle") {
    return {
      x: geometry.x + geometry.width / 2,
      y: geometry.y + geometry.height / 2,
    };
  }
  if (geometry.type === "ellipse") {
    return { x: geometry.cx, y: geometry.cy };
  }

  const points = normalisePolygonPoints(geometry.points);
  let signedDoubleArea = 0;
  let weightedX = 0;
  let weightedY = 0;
  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    const cross = point.x * nextPoint.y - nextPoint.x * point.y;
    signedDoubleArea += cross;
    weightedX += (point.x + nextPoint.x) * cross;
    weightedY += (point.y + nextPoint.y) * cross;
  });

  if (signedDoubleArea === 0) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }

  return {
    x: weightedX / (3 * signedDoubleArea),
    y: weightedY / (3 * signedDoubleArea),
  };
}

/** How many segments approximate an ellipse when it has to become a ring. */
const ELLIPSE_SEGMENTS = 32;

/**
 * Any geometry as a closed ring of points. Extruding a room into 3D needs a
 * polygon, and rectangles and ellipses are stored as neither.
 */
export function indoorGeometryRing(
  geometry: IndoorSpaceGeometry,
): readonly IndoorPoint[] {
  if (geometry.type === "rectangle") return rectangleCorners(geometry);
  if (geometry.type === "polygon")
    return normalisePolygonPoints(geometry.points);

  return Array.from({ length: ELLIPSE_SEGMENTS }, (_unused, index) => {
    const angle = (index / ELLIPSE_SEGMENTS) * Math.PI * 2;
    return {
      x: geometry.cx + Math.cos(angle) * geometry.rx,
      y: geometry.cy + Math.sin(angle) * geometry.ry,
    };
  });
}

/**
 * Expands a polyline into a closed ring of the given thickness, so a wall can
 * be extruded as a solid rather than drawn as a line.
 */
export function thickenPolyline(
  points: readonly IndoorPoint[],
  thickness: number,
  closed: boolean,
): readonly IndoorPoint[] {
  if (points.length < 2) return [];
  const half = thickness / 2;

  function offsetSide(sign: number) {
    const side: IndoorPoint[] = [];
    const segmentCount = closed ? points.length : points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length === 0) continue;
      const normalX = (-(end.y - start.y) / length) * half * sign;
      const normalY = ((end.x - start.x) / length) * half * sign;
      side.push({ x: start.x + normalX, y: start.y + normalY });
      side.push({ x: end.x + normalX, y: end.y + normalY });
    }
    return side;
  }

  // A mitre join would be tidier, but a butt join per segment is exact enough
  // at wall thickness and cannot produce a spike on a sharp corner.
  return [...offsetSide(1), ...offsetSide(-1).reverse()];
}

export function indoorGeometryBounds(
  geometry: IndoorSpaceGeometry,
): IndoorBounds {
  if (geometry.type === "rectangle") {
    return {
      minX: geometry.x,
      minY: geometry.y,
      maxX: geometry.x + geometry.width,
      maxY: geometry.y + geometry.height,
    };
  }
  if (geometry.type === "ellipse") {
    return {
      minX: geometry.cx - geometry.rx,
      minY: geometry.cy - geometry.ry,
      maxX: geometry.cx + geometry.rx,
      maxY: geometry.cy + geometry.ry,
    };
  }

  return boundsOfPoints(geometry.points);
}

export function boundsOfPoints(points: readonly IndoorPoint[]): IndoorBounds {
  if (points.length === 0) {
    throw new RangeError("Indoor bounds require at least one point.");
  }
  return points.reduce<IndoorBounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: points[0].x,
      minY: points[0].y,
      maxX: points[0].x,
      maxY: points[0].y,
    },
  );
}

export function translateIndoorGeometry(
  geometry: IndoorSpaceGeometry,
  delta: IndoorPoint,
): IndoorSpaceGeometry {
  if (geometry.type === "rectangle") {
    return { ...geometry, x: geometry.x + delta.x, y: geometry.y + delta.y };
  }
  if (geometry.type === "ellipse") {
    return {
      ...geometry,
      cx: geometry.cx + delta.x,
      cy: geometry.cy + delta.y,
    };
  }
  return {
    ...geometry,
    points: geometry.points.map((point) => ({
      x: point.x + delta.x,
      y: point.y + delta.y,
    })),
  };
}

/**
 * Refits a geometry into a new axis-aligned extent. Polygons scale about the
 * source extent, so a degenerate source axis translates rather than dividing by
 * zero.
 */
export function resizeIndoorGeometryToBounds(
  geometry: IndoorSpaceGeometry,
  bounds: IndoorBounds,
): IndoorSpaceGeometry {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  if (geometry.type === "rectangle") {
    return { ...geometry, x: bounds.minX, y: bounds.minY, width, height };
  }
  if (geometry.type === "ellipse") {
    return {
      ...geometry,
      cx: bounds.minX + width / 2,
      cy: bounds.minY + height / 2,
      rx: width / 2,
      ry: height / 2,
    };
  }

  const source = boundsOfPoints(geometry.points);
  const sourceWidth = source.maxX - source.minX;
  const sourceHeight = source.maxY - source.minY;
  return {
    ...geometry,
    points: geometry.points.map((point) => ({
      x:
        sourceWidth === 0
          ? bounds.minX + width / 2
          : bounds.minX + ((point.x - source.minX) / sourceWidth) * width,
      y:
        sourceHeight === 0
          ? bounds.minY + height / 2
          : bounds.minY + ((point.y - source.minY) / sourceHeight) * height,
    })),
  };
}

/**
 * Moves a single polygon vertex. Rectangles and ellipses resize through
 * {@link resizeIndoorGeometryToBounds} instead, so this stays polygon-only
 * rather than silently accepting a shape it cannot reshape.
 */
export function moveIndoorGeometryVertex(
  geometry: IndoorPolygonGeometry,
  index: number,
  point: IndoorPoint,
): IndoorPolygonGeometry {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= geometry.points.length
  ) {
    throw new RangeError(
      `Polygon vertex ${index} is outside a shape with ${geometry.points.length} points.`,
    );
  }
  return {
    ...geometry,
    points: geometry.points.map((existing, existingIndex) =>
      existingIndex === index ? { x: point.x, y: point.y } : existing,
    ),
  };
}

export function pointInIndoorGeometry(
  geometry: IndoorSpaceGeometry,
  point: IndoorPoint,
): boolean {
  if (geometry.type === "rectangle") {
    return (
      point.x >= geometry.x &&
      point.x <= geometry.x + geometry.width &&
      point.y >= geometry.y &&
      point.y <= geometry.y + geometry.height
    );
  }
  if (geometry.type === "ellipse") {
    if (geometry.rx === 0 || geometry.ry === 0) return false;
    const deltaX = (point.x - geometry.cx) / geometry.rx;
    const deltaY = (point.y - geometry.cy) / geometry.ry;
    return deltaX * deltaX + deltaY * deltaY <= 1;
  }

  const points = normalisePolygonPoints(geometry.points);
  let inside = false;
  for (let index = 0; index < points.length; index++) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const straddles = start.y > point.y !== end.y > point.y;
    if (!straddles) continue;
    const crossingX =
      start.x + ((point.y - start.y) / (end.y - start.y)) * (end.x - start.x);
    if (point.x < crossingX) inside = !inside;
  }
  return inside;
}
