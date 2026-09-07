import type { CampusMapBuildingGeometry } from "@/lib/rooms/campus-map";
import {
  CAMPUS_INDOOR_DOCUMENT_VERSION,
  type CampusIndoorDocument,
  type CampusIndoorViewBox,
  type CampusIndoorWall,
  type IndoorPoint,
  type IndoorSpaceGeometry,
} from "@/lib/rooms/indoor-map";
import {
  boundsOfPoints,
  indoorGeometryRing,
  isIndoorPointWithinPolygon,
  isIndoorRingWithinPolygon,
  isIndoorSegmentWithinPolygon,
  thickenPolyline,
} from "@/lib/rooms/indoor-geometry";
import {
  closestPointOnWall,
  openingPoint,
  wallSegmentLength,
} from "@/lib/rooms/indoor-walls";

const EARTH_RADIUS_METRES = 6_371_008.8;
const METRES_PER_LATITUDE_DEGREE = (2 * Math.PI * EARTH_RADIUS_METRES) / 360;
const DEFAULT_PADDING_METRES = 6;
const DEFAULT_UNITS_PER_METRE = 10;
const MAX_PADDING_METRES = 100;
const MAX_UNITS_PER_METRE = 100;
const MAX_FOOTPRINT_SPAN_METRES = 5_000;
const POINT_PRECISION = 1_000;
const DIMENSION_PRECISION = 100;

type Coordinate = readonly [longitude: number, latitude: number];
type CoordinateRing = readonly Coordinate[];

export type IndoorFootprintPolygon = Readonly<{
  exterior: readonly IndoorPoint[];
  holes: readonly (readonly IndoorPoint[])[];
}>;

/** What an inverse projection needs to turn local units back into coordinates. */
export type IndoorFootprintReference = Readonly<{
  west: number;
  north: number;
  /** Latitude the longitude scale was taken at. */
  latitude: number;
  offsetX: number;
  offsetY: number;
}>;

export type IndoorFootprintProjection = Readonly<{
  viewBox: CampusIndoorViewBox;
  reference: IndoorFootprintReference;
  outline: readonly IndoorPoint[];
  polygons: readonly IndoorFootprintPolygon[];
  dimensionsMetres: Readonly<{
    width: number;
    height: number;
  }>;
  metresPerUnit: number;
}>;

export type IndoorFootprintProjectionOptions = Readonly<{
  paddingMetres?: number;
  unitsPerMetre?: number;
}>;

function round(value: number, precision: number) {
  return Math.round(value * precision) / precision;
}

function coordinatesEqual(left: Coordinate, right: Coordinate) {
  return left[0] === right[0] && left[1] === right[1];
}

function normaliseCoordinateRing(ring: CoordinateRing) {
  const points: Coordinate[] = [];

  for (const coordinate of ring) {
    if (!points.at(-1) || !coordinatesEqual(points.at(-1)!, coordinate)) {
      points.push(coordinate);
    }
  }

  if (points.length > 3 && coordinatesEqual(points[0], points.at(-1)!)) {
    points.pop();
  }

  if (points.length < 3) {
    throw new RangeError(
      "A building footprint ring requires at least three distinct points.",
    );
  }

  return points;
}

function geometryPolygons(geometry: CampusMapBuildingGeometry) {
  return geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates;
}

function validateCoordinate([longitude, latitude]: Coordinate) {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new RangeError(
      "Building footprint coordinates must be finite longitude and latitude values.",
    );
  }
}

function validateOption(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
}

function polygonArea(points: readonly IndoorPoint[]) {
  return Math.abs(
    points.reduce((sum, point, index) => {
      const nextPoint = points[(index + 1) % points.length];
      return sum + point.x * nextPoint.y - nextPoint.x * point.y;
    }, 0) / 2,
  );
}

/**
 * Projects an OpenStreetMap building footprint into the indoor editor's local
 * coordinate system. The result is north-up and keeps the editor's routing
 * scale of ten local units per metre by default.
 */
export function projectBuildingFootprint(
  geometry: CampusMapBuildingGeometry,
  options: IndoorFootprintProjectionOptions = {},
): IndoorFootprintProjection {
  const paddingMetres = options.paddingMetres ?? DEFAULT_PADDING_METRES;
  const unitsPerMetre = options.unitsPerMetre ?? DEFAULT_UNITS_PER_METRE;
  validateOption(
    paddingMetres,
    "Footprint padding in metres",
    0,
    MAX_PADDING_METRES,
  );
  validateOption(
    unitsPerMetre,
    "Footprint units per metre",
    1,
    MAX_UNITS_PER_METRE,
  );

  const sourcePolygons = geometryPolygons(geometry).map((polygon) => {
    if (polygon.length === 0) {
      throw new RangeError(
        "A building footprint polygon requires an exterior ring.",
      );
    }
    return polygon.map(normaliseCoordinateRing);
  });
  const coordinates = sourcePolygons.flatMap((polygon) => polygon.flat());
  coordinates.forEach(validateCoordinate);

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const referenceLatitudeRadians = (((north + south) / 2) * Math.PI) / 180;
  const metresPerLongitudeDegree =
    METRES_PER_LATITUDE_DEGREE * Math.cos(referenceLatitudeRadians);
  const widthMetres = (east - west) * metresPerLongitudeDegree;
  const heightMetres = (north - south) * METRES_PER_LATITUDE_DEGREE;

  if (
    widthMetres <= 0 ||
    heightMetres <= 0 ||
    widthMetres > MAX_FOOTPRINT_SPAN_METRES ||
    heightMetres > MAX_FOOTPRINT_SPAN_METRES
  ) {
    throw new RangeError(
      `A building footprint must span between 0 and ${MAX_FOOTPRINT_SPAN_METRES} metres on each axis.`,
    );
  }

  const paddingUnits = paddingMetres * unitsPerMetre;
  const contentWidth = widthMetres * unitsPerMetre;
  const contentHeight = heightMetres * unitsPerMetre;
  const viewBox = {
    width: Math.ceil(round(contentWidth, POINT_PRECISION) + paddingUnits * 2),
    height: Math.ceil(round(contentHeight, POINT_PRECISION) + paddingUnits * 2),
  } satisfies CampusIndoorViewBox;
  const offsetX = (viewBox.width - contentWidth) / 2;
  const offsetY = (viewBox.height - contentHeight) / 2;

  function projectRing(ring: CoordinateRing) {
    return ring.map(([longitude, latitude]) => ({
      x: round(
        offsetX + (longitude - west) * metresPerLongitudeDegree * unitsPerMetre,
        POINT_PRECISION,
      ),
      y: round(
        offsetY +
          (north - latitude) * METRES_PER_LATITUDE_DEGREE * unitsPerMetre,
        POINT_PRECISION,
      ),
    }));
  }

  const polygons = sourcePolygons.map((polygon) => ({
    exterior: projectRing(polygon[0]),
    holes: polygon.slice(1).map(projectRing),
  }));
  const outline = polygons.reduce((largest, polygon) =>
    polygonArea(polygon.exterior) > polygonArea(largest.exterior)
      ? polygon
      : largest,
  ).exterior;

  return {
    viewBox,
    reference: {
      west,
      north,
      latitude: (north + south) / 2,
      offsetX,
      offsetY,
    },
    outline,
    polygons,
    dimensionsMetres: {
      width: round(widthMetres, DIMENSION_PRECISION),
      height: round(heightMetres, DIMENSION_PRECISION),
    },
    metresPerUnit: 1 / unitsPerMetre,
  };
}

/** Default perimeter wall thickness, 0.2 m at ten local units per metre. */
const PERIMETER_WALL_THICKNESS = 2;

/**
 * Starts a floor map against the selected building's real footprint. Stable
 * identifiers keep this pure and make an untouched document deterministic. The
 * outline is also drawn as a closed perimeter wall so a new map opens with the
 * real building already on the canvas.
 */
export function createIndoorDocumentForFootprint(
  projection: IndoorFootprintProjection,
): CampusIndoorDocument {
  const outline = projection.outline.map((point) => ({ ...point }));
  return {
    version: CAMPUS_INDOOR_DOCUMENT_VERSION,
    viewBox: { ...projection.viewBox },
    levels: [
      {
        id: "level-ground",
        number: 0,
        ref: "G",
        name: "Ground floor",
        elevationMetres: 0,
        heightMetres: 3.6,
        outline,
      },
    ],
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: outline.map((point) => ({ ...point })),
        thickness: PERIMETER_WALL_THICKNESS,
        closed: true,
        openings: [],
      },
    ],
    spaces: [],
    connectors: [],
    routeNodes: [],
    routeEdges: [],
  };
}

/**
 * Turns a local point back into longitude and latitude.
 *
 * {@link projectBuildingFootprint} is a deterministic north-up equirectangular
 * projection about the footprint's own bounding box, so it inverts exactly.
 * This only holds while a document's viewBox still matches its building's
 * projection, which the editor guarantees by always drawing on the real
 * footprint.
 */
export function unprojectIndoorPoint(
  projection: IndoorFootprintProjection,
  point: IndoorPoint,
): readonly [longitude: number, latitude: number] {
  const { reference } = projection;
  const unitsPerMetre = 1 / projection.metresPerUnit;
  const metresPerLongitudeDegree =
    METRES_PER_LATITUDE_DEGREE * Math.cos((reference.latitude * Math.PI) / 180);

  return [
    reference.west +
      (point.x - reference.offsetX) / unitsPerMetre / metresPerLongitudeDegree,
    reference.north -
      (point.y - reference.offsetY) /
        unitsPerMetre /
        METRES_PER_LATITUDE_DEGREE,
  ];
}

/**
 * Turns a map coordinate into the local units an indoor document is authored
 * in. This is what lets the editor draw a room by dragging on the building
 * itself rather than on a separate plan.
 */
export function projectIndoorPoint(
  projection: IndoorFootprintProjection,
  longitude: number,
  latitude: number,
): IndoorPoint {
  const { reference } = projection;
  const unitsPerMetre = 1 / projection.metresPerUnit;
  const metresPerLongitudeDegree =
    METRES_PER_LATITUDE_DEGREE * Math.cos((reference.latitude * Math.PI) / 180);

  return {
    x:
      reference.offsetX +
      (longitude - reference.west) * metresPerLongitudeDegree * unitsPerMetre,
    y:
      reference.offsetY +
      (reference.north - latitude) * METRES_PER_LATITUDE_DEGREE * unitsPerMetre,
  };
}

type ViewBoxTransform = Readonly<{
  scaleX: number;
  scaleY: number;
  target: CampusIndoorViewBox;
}>;

function remapPoint(point: IndoorPoint, transform: ViewBoxTransform) {
  return {
    x: Math.min(
      transform.target.width,
      Math.max(0, point.x * transform.scaleX),
    ),
    y: Math.min(
      transform.target.height,
      Math.max(0, point.y * transform.scaleY),
    ),
  } satisfies IndoorPoint;
}

function remapGeometry(
  geometry: IndoorSpaceGeometry,
  transform: ViewBoxTransform,
): IndoorSpaceGeometry {
  if (geometry.type === "rectangle") {
    const start = remapPoint({ x: geometry.x, y: geometry.y }, transform);
    const end = remapPoint(
      {
        x: geometry.x + geometry.width,
        y: geometry.y + geometry.height,
      },
      transform,
    );
    const width = end.x - start.x;
    const height = end.y - start.y;
    return {
      ...geometry,
      x: start.x,
      y: start.y,
      width,
      height,
      cornerRadius: Math.min(
        geometry.cornerRadius * Math.min(transform.scaleX, transform.scaleY),
        width / 2,
        height / 2,
      ),
    };
  }

  if (geometry.type === "ellipse") {
    const centre = remapPoint({ x: geometry.cx, y: geometry.cy }, transform);
    const horizontal = remapPoint(
      { x: geometry.cx + geometry.rx, y: geometry.cy },
      transform,
    );
    const vertical = remapPoint(
      { x: geometry.cx, y: geometry.cy + geometry.ry },
      transform,
    );
    return {
      ...geometry,
      cx: centre.x,
      cy: centre.y,
      rx: horizontal.x - centre.x,
      ry: vertical.y - centre.y,
    };
  }

  return {
    ...geometry,
    points: geometry.points.map((point) => remapPoint(point, transform)),
  };
}

type FootprintPolygon = Readonly<{
  exterior: readonly IndoorPoint[];
  holes: readonly (readonly IndoorPoint[])[];
}>;

type OrientedFrame = Readonly<{
  angle: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

type CoherentTransform = Readonly<{
  point: (point: IndoorPoint) => IndoorPoint;
  scale: number;
  rotates: boolean;
}>;

const CONTAINMENT_SEARCH_STEPS = 36;
const CONTAINMENT_BINARY_STEPS = 28;
/** Connectors render as a 24-unit square shaft in the 3D scene. */
const CONNECTOR_HALF_SIZE_UNITS = 12;
const CONTENT_INSET_UNITS = CONNECTOR_HALF_SIZE_UNITS * Math.SQRT2;
const RING_MATCH_TOLERANCE = 0.01;
const ANGLE_TOLERANCE = 1e-6;

function pointsNearlyEqual(
  left: IndoorPoint,
  right: IndoorPoint,
  tolerance = RING_MATCH_TOLERANCE,
) {
  return (
    Math.abs(left.x - right.x) <= tolerance &&
    Math.abs(left.y - right.y) <= tolerance
  );
}

function ringsMatch(
  left: readonly IndoorPoint[],
  right: readonly IndoorPoint[],
) {
  if (left.length !== right.length) return false;
  for (let offset = 0; offset < right.length; offset += 1) {
    if (!pointsNearlyEqual(left[0], right[offset])) continue;
    for (const direction of [1, -1]) {
      if (
        left.every((point, index) =>
          pointsNearlyEqual(
            point,
            right[(offset + direction * index + right.length) % right.length],
          ),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function canonicalFootprintPolygon(
  projection: IndoorFootprintProjection,
): FootprintPolygon {
  const matching = projection.polygons.find((polygon) =>
    ringsMatch(polygon.exterior, projection.outline),
  );
  return {
    exterior: projection.outline,
    holes: matching?.holes ?? [],
  };
}

function usableFootprintPolygons(
  projection: IndoorFootprintProjection,
): readonly FootprintPolygon[] {
  return projection.polygons.length > 0
    ? projection.polygons
    : [canonicalFootprintPolygon(projection)];
}

/** True when a point belongs to any usable footprint part and no courtyard. */
export function isIndoorPointWithinFootprint(
  point: IndoorPoint,
  projection: IndoorFootprintProjection,
) {
  return usableFootprintPolygons(projection).some((polygon) =>
    isIndoorPointWithinPolygon(point, polygon.exterior, polygon.holes),
  );
}

/** A segment must stay inside one footprint part rather than jump a gap. */
export function isIndoorSegmentWithinFootprint(
  start: IndoorPoint,
  end: IndoorPoint,
  projection: IndoorFootprintProjection,
) {
  return usableFootprintPolygons(projection).some((polygon) =>
    isIndoorSegmentWithinPolygon(start, end, polygon.exterior, polygon.holes),
  );
}

/** A complete room or shaft must fit within one footprint part. */
export function isIndoorRingWithinFootprint(
  ring: readonly IndoorPoint[],
  projection: IndoorFootprintProjection,
) {
  return usableFootprintPolygons(projection).some((polygon) =>
    isIndoorRingWithinPolygon(ring, polygon.exterior, polygon.holes),
  );
}

function normaliseHalfTurn(angle: number) {
  let result = angle;
  while (result <= -Math.PI / 2) result += Math.PI;
  while (result > Math.PI / 2) result -= Math.PI;
  return result;
}

function pointInFrame(point: IndoorPoint, angle: number) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine + point.y * sine,
    y: -point.x * sine + point.y * cosine,
  };
}

function pointFromFrame(point: IndoorPoint, angle: number) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function frameAtAngle(points: readonly IndoorPoint[], angle: number) {
  const normalisedAngle = normaliseHalfTurn(angle);
  const framePoints = points.map((point) =>
    pointInFrame(point, normalisedAngle),
  );
  const bounds = boundsOfPoints(framePoints);
  return {
    angle: normalisedAngle,
    ...bounds,
  } satisfies OrientedFrame;
}

/**
 * Finds a polygon's minimum-area oriented bounding frame. Using a footprint
 * edge as each candidate axis is sufficient for a simple polygon's minimum
 * bounding rectangle and gives the legacy plan and real footprint a stable
 * dominant direction.
 */
function minimumAreaFrame(points: readonly IndoorPoint[]): OrientedFrame {
  let best: OrientedFrame | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const edgeAngle = Math.atan2(next.y - point.y, next.x - point.x);
    let candidate = frameAtAngle(points, edgeAngle);
    if (candidate.maxY - candidate.minY > candidate.maxX - candidate.minX) {
      candidate = frameAtAngle(points, edgeAngle + Math.PI / 2);
    }
    const area =
      (candidate.maxX - candidate.minX) * (candidate.maxY - candidate.minY);
    if (area < bestArea) {
      best = candidate;
      bestArea = area;
    }
  });

  if (!best) throw new RangeError("A footprint frame requires an outline.");
  return best;
}

function frameCentre(frame: OrientedFrame) {
  return {
    x: (frame.minX + frame.maxX) / 2,
    y: (frame.minY + frame.maxY) / 2,
  };
}

function orientedRectangle(
  centre: IndoorPoint,
  width: number,
  height: number,
  angle: number,
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => {
    const rotated = pointFromFrame(point, angle);
    return { x: centre.x + rotated.x, y: centre.y + rotated.y };
  });
}

function horizontalIntersections(ring: readonly IndoorPoint[], y: number) {
  const intersections: number[] = [];
  ring.forEach((start, index) => {
    const end = ring[(index + 1) % ring.length];
    if (start.y > y === end.y > y) return;
    intersections.push(
      start.x + ((y - start.y) / (end.y - start.y)) * (end.x - start.x),
    );
  });
  return intersections;
}

function containmentCandidates(
  polygon: FootprintPolygon,
  expected: IndoorPoint,
) {
  const bounds = boundsOfPoints(polygon.exterior);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const candidates: IndoorPoint[] = [expected];

  for (let row = 0; row < CONTAINMENT_SEARCH_STEPS; row += 1) {
    const y = bounds.minY + ((row + 0.5) / CONTAINMENT_SEARCH_STEPS) * height;
    const intersections = [
      ...horizontalIntersections(polygon.exterior, y),
      ...polygon.holes.flatMap((hole) => horizontalIntersections(hole, y)),
    ].sort((left, right) => left - right);

    for (let index = 0; index < intersections.length - 1; index += 1) {
      const start = intersections[index];
      const end = intersections[index + 1];
      for (const share of [0.25, 0.5, 0.75]) {
        const candidate = { x: start + (end - start) * share, y };
        if (
          isIndoorPointWithinPolygon(candidate, polygon.exterior, polygon.holes)
        ) {
          candidates.push(candidate);
        }
      }
    }
  }

  for (let row = 0; row < CONTAINMENT_SEARCH_STEPS; row += 1) {
    for (let column = 0; column < CONTAINMENT_SEARCH_STEPS; column += 1) {
      const candidate = {
        x: bounds.minX + ((column + 0.5) / CONTAINMENT_SEARCH_STEPS) * width,
        y: bounds.minY + ((row + 0.5) / CONTAINMENT_SEARCH_STEPS) * height,
      };
      if (
        isIndoorPointWithinPolygon(candidate, polygon.exterior, polygon.holes)
      ) {
        candidates.push(candidate);
      }
    }
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (
      !isIndoorPointWithinPolygon(candidate, polygon.exterior, polygon.holes)
    ) {
      return false;
    }
    const key = `${round(candidate.x, POINT_PRECISION)}:${round(candidate.y, POINT_PRECISION)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findContainedRectangle(
  contentWidth: number,
  contentHeight: number,
  angle: number,
  polygon: FootprintPolygon,
  expected: IndoorPoint,
  inset: number,
) {
  let best: { centre: IndoorPoint; scale: number; distance: number } | null =
    null;

  function contained(centre: IndoorPoint, scale: number) {
    const ring = orientedRectangle(
      centre,
      contentWidth * scale + inset * 2,
      contentHeight * scale + inset * 2,
      angle,
    );
    return isIndoorRingWithinPolygon(ring, polygon.exterior, polygon.holes);
  }

  for (const centre of containmentCandidates(polygon, expected)) {
    if (!contained(centre, 0)) continue;
    let low = 0;
    let high = 1;
    if (contained(centre, 1)) {
      low = 1;
    } else {
      for (let index = 0; index < CONTAINMENT_BINARY_STEPS; index += 1) {
        const middle = (low + high) / 2;
        if (contained(centre, middle)) low = middle;
        else high = middle;
      }
    }

    const distance = Math.hypot(centre.x - expected.x, centre.y - expected.y);
    if (
      !best ||
      low > best.scale + RING_MATCH_TOLERANCE ||
      (Math.abs(low - best.scale) <= RING_MATCH_TOLERANCE &&
        distance < best.distance)
    ) {
      best = { centre, scale: low, distance };
    }
  }

  return best;
}

function contentPoints(document: CampusIndoorDocument) {
  return [
    ...document.walls
      .filter((wall) => !isGeneratedPerimeterWall(wall))
      .flatMap((wall) => {
        const segmentCount = wall.closed
          ? wall.points.length
          : wall.points.length - 1;
        return Array.from({ length: segmentCount }, (_unused, index) =>
          thickenPolyline(
            [wall.points[index], wall.points[(index + 1) % wall.points.length]],
            Math.max(wall.thickness, 1),
            false,
          ),
        ).flat();
      }),
    ...document.spaces.flatMap((space) => indoorGeometryRing(space.geometry)),
    ...document.connectors.map((connector) => connector.position),
    ...document.routeNodes.map((node) => node.position),
  ];
}

/**
 * Final authoring guard used before an indoor document is saved. It validates
 * visible geometry rather than just view-box numbers, including concave
 * notches, courtyards and gaps between multipolygon parts.
 */
export function isIndoorDocumentWithinFootprint(
  document: CampusIndoorDocument,
  projection: IndoorFootprintProjection,
) {
  if (
    !document.levels.every((level) =>
      ringsMatch(level.outline, projection.outline),
    )
  ) {
    return false;
  }

  for (const wall of document.walls) {
    const generatedPerimeter = isGeneratedPerimeterWall(wall);
    const canonicalPerimeter =
      wall.kind === "structural" &&
      wall.closed &&
      wall.thickness === PERIMETER_WALL_THICKNESS &&
      ringsMatch(wall.points, projection.outline);
    if (generatedPerimeter && !canonicalPerimeter) return false;
    if (canonicalPerimeter) continue;

    const segmentCount = wall.closed
      ? wall.points.length
      : wall.points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const start = wall.points[index];
      const end = wall.points[(index + 1) % wall.points.length];
      if (!isIndoorSegmentWithinFootprint(start, end, projection)) {
        return false;
      }
      if (
        !isIndoorRingWithinFootprint(
          thickenPolyline([start, end], Math.max(wall.thickness, 1), false),
          projection,
        )
      ) {
        return false;
      }
    }
  }

  if (
    document.spaces.some(
      (space) =>
        !isIndoorRingWithinFootprint(
          indoorGeometryRing(space.geometry),
          projection,
        ),
    )
  ) {
    return false;
  }

  if (
    document.connectors.some(
      (connector) =>
        !isIndoorRingWithinFootprint(
          orientedRectangle(
            connector.position,
            CONNECTOR_HALF_SIZE_UNITS * 2,
            CONNECTOR_HALF_SIZE_UNITS * 2,
            0,
          ),
          projection,
        ),
    )
  ) {
    return false;
  }

  if (
    document.routeNodes.some(
      (node) => !isIndoorPointWithinFootprint(node.position, projection),
    )
  ) {
    return false;
  }

  const nodes = new Map(document.routeNodes.map((node) => [node.id, node]));
  return document.routeEdges.every((edge) => {
    const from = nodes.get(edge.fromNodeId);
    const to = nodes.get(edge.toNodeId);
    if (!from || !to || from.levelId !== to.levelId) return true;
    return isIndoorSegmentWithinFootprint(
      from.position,
      to.position,
      projection,
    );
  });
}

function transformedGeometry(
  geometry: IndoorSpaceGeometry,
  transform: CoherentTransform,
): IndoorSpaceGeometry {
  if (transform.rotates) {
    return {
      type: "polygon",
      points: indoorGeometryRing(geometry).map(transform.point),
    };
  }
  if (geometry.type === "rectangle") {
    const origin = transform.point({ x: geometry.x, y: geometry.y });
    return {
      ...geometry,
      x: origin.x,
      y: origin.y,
      width: geometry.width * transform.scale,
      height: geometry.height * transform.scale,
      cornerRadius: geometry.cornerRadius * transform.scale,
    };
  }
  if (geometry.type === "ellipse") {
    const centre = transform.point({ x: geometry.cx, y: geometry.cy });
    return {
      ...geometry,
      cx: centre.x,
      cy: centre.y,
      rx: geometry.rx * transform.scale,
      ry: geometry.ry * transform.scale,
    };
  }
  return {
    ...geometry,
    points: geometry.points.map(transform.point),
  };
}

function coherentFootprintTransform(
  document: CampusIndoorDocument,
  projection: IndoorFootprintProjection,
): CoherentTransform | null {
  const content = contentPoints(document);
  if (content.length === 0) return null;

  const sourceOutline = document.levels.reduce((largest, level) =>
    polygonArea(level.outline) > polygonArea(largest.outline) ? level : largest,
  ).outline;
  const sourceFrame = minimumAreaFrame(sourceOutline);
  const targetFrame = minimumAreaFrame(projection.outline);
  const sourceContent = content.map((point) =>
    pointInFrame(point, sourceFrame.angle),
  );
  const contentBounds = boundsOfPoints(sourceContent);
  const contentCentre = {
    x: (contentBounds.minX + contentBounds.maxX) / 2,
    y: (contentBounds.minY + contentBounds.maxY) / 2,
  };
  const sourceCentre = frameCentre(sourceFrame);
  const targetCentre = frameCentre(targetFrame);
  const sourceWidth = sourceFrame.maxX - sourceFrame.minX;
  const sourceHeight = sourceFrame.maxY - sourceFrame.minY;
  const targetWidth = targetFrame.maxX - targetFrame.minX;
  const targetHeight = targetFrame.maxY - targetFrame.minY;
  const expectedInTargetFrame = {
    x:
      targetCentre.x +
      ((contentCentre.x - sourceCentre.x) / (sourceWidth || 1)) * targetWidth,
    y:
      targetCentre.y +
      ((contentCentre.y - sourceCentre.y) / (sourceHeight || 1)) * targetHeight,
  };
  const expected = pointFromFrame(expectedInTargetFrame, targetFrame.angle);
  const polygon = canonicalFootprintPolygon(projection);
  const placement =
    findContainedRectangle(
      contentBounds.maxX - contentBounds.minX,
      contentBounds.maxY - contentBounds.minY,
      targetFrame.angle,
      polygon,
      expected,
      document.connectors.length > 0 ? CONTENT_INSET_UNITS : 1,
    ) ??
    findContainedRectangle(
      contentBounds.maxX - contentBounds.minX,
      contentBounds.maxY - contentBounds.minY,
      targetFrame.angle,
      polygon,
      expected,
      0,
    );
  if (!placement || placement.scale <= ANGLE_TOLERANCE) return null;

  const rotation = normaliseHalfTurn(targetFrame.angle - sourceFrame.angle);
  return {
    scale: placement.scale,
    rotates: Math.abs(rotation) > ANGLE_TOLERANCE,
    point(point) {
      const source = pointInFrame(point, sourceFrame.angle);
      const target = pointFromFrame(
        {
          x: (source.x - contentCentre.x) * placement.scale,
          y: (source.y - contentCentre.y) * placement.scale,
        },
        targetFrame.angle,
      );
      return {
        x: placement.centre.x + target.x,
        y: placement.centre.y + target.y,
      };
    },
  };
}

function isGeneratedPerimeterWall(wall: CampusIndoorWall) {
  return wall.id === `wall-outline-${wall.levelId}`;
}

/**
 * Rebuilds a generated perimeter against the canonical building outline.
 * Opening centres first follow the old view-box transform, then snap to the
 * nearest real perimeter segment. Their widths and offsets are clamped so the
 * opening cannot overhang a shorter replacement segment.
 */
function remapGeneratedPerimeterWall(
  wall: CampusIndoorWall,
  transformPoint: (point: IndoorPoint) => IndoorPoint,
  projection: IndoorFootprintProjection,
): CampusIndoorWall {
  const points = projection.outline.map((point) => ({ ...point }));
  const perimeter = { points, closed: true } as const;

  return {
    ...wall,
    points,
    closed: true,
    openings: wall.openings.map((opening) => {
      const anchor = transformPoint(openingPoint(wall, opening));
      const snapped = closestPointOnWall(perimeter, anchor);
      if (!snapped) return { ...opening };

      const segmentLength = wallSegmentLength(perimeter, snapped.segmentIndex);
      const width = Math.min(opening.width, segmentLength);
      const halfOffset = segmentLength === 0 ? 0 : width / 2 / segmentLength;

      return {
        ...opening,
        segmentIndex: snapped.segmentIndex,
        offset: Math.min(1 - halfOffset, Math.max(halfOffset, snapped.offset)),
        width,
      };
    }),
  };
}

function transformAuthoredWall(
  wall: CampusIndoorWall,
  transform: CoherentTransform,
): CampusIndoorWall {
  const points = wall.points.map(transform.point);
  const transformed = { points, closed: wall.closed } as const;
  return {
    ...wall,
    points,
    thickness: Math.max(0.1, wall.thickness * transform.scale),
    openings: wall.openings.map((opening) => {
      const segmentLength = wallSegmentLength(
        transformed,
        opening.segmentIndex,
      );
      const width = Math.min(opening.width * transform.scale, segmentLength);
      const halfOffset = segmentLength === 0 ? 0 : width / 2 / segmentLength;
      return {
        ...opening,
        offset: Math.min(1 - halfOffset, Math.max(halfOffset, opening.offset)),
        width,
      };
    }),
  };
}

/**
 * Moves an existing map onto a newly projected footprint. A document already
 * authored against the canonical outline keeps its coordinates. A legacy plan
 * instead follows one document-level similarity transform from the source
 * footprint's dominant direction to the target's. The whole authored content
 * is conservatively fitted into one contained rectangle, so spaces, wall and
 * route segments cannot bridge a concave notch while their relative positions
 * remain intact.
 */
export function remapIndoorDocumentToFootprint(
  document: CampusIndoorDocument,
  projection: IndoorFootprintProjection,
): CampusIndoorDocument {
  if (
    !Number.isFinite(document.viewBox.width) ||
    document.viewBox.width <= 0 ||
    !Number.isFinite(document.viewBox.height) ||
    document.viewBox.height <= 0
  ) {
    throw new RangeError(
      "An indoor document requires a positive finite viewBox before it can be remapped.",
    );
  }

  const transform = {
    scaleX: projection.viewBox.width / document.viewBox.width,
    scaleY: projection.viewBox.height / document.viewBox.height,
    target: projection.viewBox,
  } satisfies ViewBoxTransform;
  const footprintOutline = () =>
    projection.outline.map((point) => ({ ...point }));
  const viewBoxPoint = (point: IndoorPoint) => remapPoint(point, transform);
  const provisional = {
    ...document,
    viewBox: { ...projection.viewBox },
    levels: document.levels.map((level) => ({
      ...level,
      outline: footprintOutline(),
    })),
    walls: document.walls.map((wall) =>
      isGeneratedPerimeterWall(wall)
        ? remapGeneratedPerimeterWall(wall, viewBoxPoint, projection)
        : {
            ...wall,
            points: wall.points.map((point) => remapPoint(point, transform)),
            openings: wall.openings.map((opening) => ({ ...opening })),
          },
    ),
    spaces: document.spaces.map((space) => ({
      ...space,
      geometry: remapGeometry(space.geometry, transform),
    })),
    connectors: document.connectors.map((connector) => ({
      ...connector,
      position: remapPoint(connector.position, transform),
    })),
    routeNodes: document.routeNodes.map((node) => ({
      ...node,
      position: remapPoint(node.position, transform),
    })),
    routeEdges: document.routeEdges.map((edge) => ({ ...edge })),
  } satisfies CampusIndoorDocument;

  const alreadyCanonical = document.levels.every((level) =>
    ringsMatch(level.outline, projection.outline),
  );
  if (
    alreadyCanonical &&
    isIndoorDocumentWithinFootprint(provisional, projection)
  ) {
    return provisional;
  }

  const coherent = coherentFootprintTransform(document, projection);
  if (!coherent) return provisional;

  return {
    ...document,
    viewBox: { ...projection.viewBox },
    levels: document.levels.map((level) => ({
      ...level,
      outline: footprintOutline(),
    })),
    walls: document.walls.map((wall) =>
      isGeneratedPerimeterWall(wall)
        ? remapGeneratedPerimeterWall(wall, coherent.point, projection)
        : transformAuthoredWall(wall, coherent),
    ),
    spaces: document.spaces.map((space) => ({
      ...space,
      geometry: transformedGeometry(space.geometry, coherent),
    })),
    connectors: document.connectors.map((connector) => ({
      ...connector,
      position: coherent.point(connector.position),
    })),
    routeNodes: document.routeNodes.map((node) => ({
      ...node,
      position: coherent.point(node.position),
    })),
    routeEdges: document.routeEdges.map((edge) => ({ ...edge })),
  };
}
