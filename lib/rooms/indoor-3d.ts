import {
  indoorGeometryCentre,
  indoorGeometryRing,
  thickenPolyline,
} from "@/lib/rooms/indoor-geometry";
import {
  unprojectIndoorPoint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";
import { openingEndpoints, openingNormal } from "@/lib/rooms/indoor-walls";
import type {
  CampusIndoorDocument,
  CampusIndoorLevel,
  CampusIndoorWall,
  CampusIndoorWallOpening,
  IndoorPoint,
} from "@/lib/rooms/indoor-map";

/**
 * Turns an indoor document into 3D geometry the campus map can extrude.
 *
 * Everything indoors is authored in local units on the building's real
 * OpenStreetMap footprint, and that projection inverts exactly, so a room can
 * be placed back on the map at the right height instead of being drawn on a
 * separate flat plan. Searching a room then stays one continuous camera move:
 * fly to the building, lift its floors apart, and look inside.
 */
export type IndoorSceneOptions = Readonly<{
  /**
   * How far apart to pull the floors, as a multiple of their real spacing.
   * One leaves the building solid; larger values open it up so you can see in.
   */
  explode?: number;
  /**
   * Whether floors other than the active one belong in the scene. The editor
   * hides them while drawing a plan and restores them as faint plates in the
   * whole-building view.
   */
  showInactiveLevels?: boolean;
  /** The floor being worked on or walked through, drawn most prominently. */
  activeLevelId?: string | null;
  /** Rooms drawn as the destination. */
  highlightSpaceIds?: ReadonlySet<string>;
  /** Route edges drawn as the way to go. */
  routeEdgeIds?: ReadonlySet<string>;
}>;

type Ring = readonly (readonly [number, number])[];

export type IndoorSceneFeature = Readonly<{
  type: "Feature";
  id?: string;
  properties: Readonly<Record<string, string | number | boolean>>;
  geometry:
    | Readonly<{ type: "Polygon"; coordinates: readonly Ring[] }>
    | Readonly<{ type: "LineString"; coordinates: Ring }>;
}>;

export type IndoorSceneCollection = Readonly<{
  type: "FeatureCollection";
  features: readonly IndoorSceneFeature[];
}>;

export type IndoorScene = Readonly<{
  /** Floor slabs, so an opened building reads as stacked plates. */
  slabs: IndoorSceneCollection;
  rooms: IndoorSceneCollection;
  walls: IndoorSceneCollection;
  /** Authored doors and doorless gaps, drawn independently from their wall. */
  openings: IndoorSceneCollection;
  connectors: IndoorSceneCollection;
  /** The walking route, including its vertical legs. */
  route: IndoorSceneCollection;
  labels: IndoorSceneCollection;
  /** Height of the opened building in metres, for framing the camera. */
  topMetres: number;
}>;

const SLAB_THICKNESS_METRES = 0.05;
const PERIMETER_RIM_HEIGHT_METRES = 0.12;
const ROOM_INSET_METRES = 0.1;
const ROUTE_HEIGHT_METRES = 0.35;
/** Route ribbon width in local units, so 0.6 m. */
const ROUTE_WIDTH_UNITS = 6;
const DEFAULT_LEVEL_HEIGHT_METRES = 3.6;
const OPENING_MARKER_DEPTH_UNITS = 8;
const ENTRANCE_MARKER_DEPTH_UNITS = 14;
const OPENING_MARKER_HEIGHT_METRES = 0.18;

function collection(
  features: readonly IndoorSceneFeature[],
): IndoorSceneCollection {
  return { type: "FeatureCollection", features };
}

/** Where a floor sits once the building has been opened up. */
export function levelBaseMetres(level: CampusIndoorLevel, explode: number) {
  return level.elevationMetres * explode;
}

function ring(
  points: readonly IndoorPoint[],
  projection: IndoorFootprintProjection,
): Ring {
  const coordinates = points.map((point) =>
    unprojectIndoorPoint(projection, point),
  );
  const first = coordinates[0];
  const last = coordinates.at(-1);
  // GeoJSON polygons close themselves; indoor rings do not.
  return last && (first[0] !== last[0] || first[1] !== last[1])
    ? [...coordinates, first]
    : coordinates;
}

function polygon(
  points: readonly IndoorPoint[],
  projection: IndoorFootprintProjection,
  properties: IndoorSceneFeature["properties"],
  id?: string,
): IndoorSceneFeature | null {
  if (points.length < 3) return null;
  return {
    type: "Feature",
    ...(id ? { id } : {}),
    properties,
    geometry: { type: "Polygon", coordinates: [ring(points, projection)] },
  };
}

function footprintPolygon(
  exterior: readonly IndoorPoint[],
  holes: readonly (readonly IndoorPoint[])[],
  projection: IndoorFootprintProjection,
  properties: IndoorSceneFeature["properties"],
  id: string,
): IndoorSceneFeature | null {
  if (exterior.length < 3) return null;
  return {
    type: "Feature",
    id,
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [
        ring(exterior, projection),
        ...holes
          .filter((hole) => hole.length >= 3)
          .map((hole) => ring(hole, projection)),
      ],
    },
  };
}

function pointsEqual(left: IndoorPoint, right: IndoorPoint) {
  return left.x === right.x && left.y === right.y;
}

/** Ring comparison tolerates a different first vertex and winding direction. */
function ringsEqual(
  left: readonly IndoorPoint[],
  right: readonly IndoorPoint[],
) {
  if (left.length !== right.length || left.length === 0) return false;

  return right.some((_point, offset) => {
    const forwards = left.every((point, index) =>
      pointsEqual(point, right[(offset + index) % right.length]),
    );
    const backwards = left.every((point, index) =>
      pointsEqual(point, right[(offset - index + right.length) % right.length]),
    );
    return forwards || backwards;
  });
}

function openingMarkerRing(
  wall: Pick<CampusIndoorWall, "points" | "closed" | "thickness">,
  opening: Pick<
    CampusIndoorWallOpening,
    "segmentIndex" | "offset" | "width" | "exterior"
  >,
) {
  const [start, end] = openingEndpoints(wall, opening);
  const normal = openingNormal(wall, opening);
  const markerDepth = Math.max(
    wall.thickness + 4,
    opening.exterior ? ENTRANCE_MARKER_DEPTH_UNITS : OPENING_MARKER_DEPTH_UNITS,
  );
  const halfDepth = markerDepth / 2;

  return [
    {
      x: start.x + normal.x * halfDepth,
      y: start.y + normal.y * halfDepth,
    },
    {
      x: end.x + normal.x * halfDepth,
      y: end.y + normal.y * halfDepth,
    },
    {
      x: end.x - normal.x * halfDepth,
      y: end.y - normal.y * halfDepth,
    },
    {
      x: start.x - normal.x * halfDepth,
      y: start.y - normal.y * halfDepth,
    },
  ];
}

export function buildIndoorScene(
  document: CampusIndoorDocument,
  projection: IndoorFootprintProjection,
  options: IndoorSceneOptions = {},
): IndoorScene {
  const explode = options.explode ?? 1;
  const activeLevelId = options.activeLevelId ?? null;
  const showInactiveLevels = options.showInactiveLevels ?? true;
  const highlighted = options.highlightSpaceIds ?? new Set<string>();
  const routeEdgeIds = options.routeEdgeIds ?? new Set<string>();

  const levels = [...document.levels].sort(
    (left, right) => left.number - right.number,
  );
  const levelsById = new Map(levels.map((level) => [level.id, level]));

  const slabs: IndoorSceneFeature[] = [];
  const rooms: IndoorSceneFeature[] = [];
  const walls: IndoorSceneFeature[] = [];
  const openings: IndoorSceneFeature[] = [];
  const connectors: IndoorSceneFeature[] = [];
  const route: IndoorSceneFeature[] = [];
  const labels: IndoorSceneFeature[] = [];

  for (const level of levels) {
    const base = levelBaseMetres(level, explode);
    const active = activeLevelId === null || level.id === activeLevelId;
    if (!active && !showInactiveLevels) continue;
    const footprintParts =
      projection.polygons.length > 0
        ? projection.polygons
        : [{ exterior: level.outline, holes: [] }];

    footprintParts.forEach((part, partIndex) => {
      const slab = footprintPolygon(
        part.exterior,
        part.holes,
        projection,
        {
          levelId: level.id,
          levelRef: level.ref,
          levelName: level.name,
          base,
          height: base + SLAB_THICKNESS_METRES,
          active,
        },
        `${level.id}:footprint:${partIndex}`,
      );
      if (slab) slabs.push(slab);
    });
  }

  for (const space of document.spaces) {
    const level = levelsById.get(space.levelId);
    if (!level) continue;
    const base = levelBaseMetres(level, explode) + SLAB_THICKNESS_METRES;
    const active = activeLevelId === null || space.levelId === activeLevelId;
    if (!active && !showInactiveLevels) continue;
    const room = polygon(
      indoorGeometryRing(space.geometry),
      projection,
      {
        spaceId: space.id,
        levelId: space.levelId,
        kind: space.kind,
        ref: space.ref,
        name: space.name,
        base,
        // Rooms stop short of the ceiling so you can see down into the floor.
        height:
          base + Math.max(level.heightMetres - ROOM_INSET_METRES, 0.5) * 0.55,
        active,
        highlight: highlighted.has(space.id),
      },
      space.id,
    );
    if (!room) continue;
    rooms.push(room);

    if (space.ref || space.name) {
      const centre = unprojectIndoorPoint(
        projection,
        indoorGeometryCentre(space.geometry),
      );
      labels.push({
        type: "Feature",
        properties: {
          spaceId: space.id,
          levelId: space.levelId,
          levelRef: level.ref,
          label: space.ref || space.name,
          active,
          highlight: highlighted.has(space.id),
        },
        geometry: { type: "LineString", coordinates: [centre, centre] },
      });
    }
  }

  for (const wall of document.walls) {
    const level = levelsById.get(wall.levelId);
    if (!level) continue;
    const active = activeLevelId === null || wall.levelId === activeLevelId;
    if (!active && !showInactiveLevels) continue;
    const base = levelBaseMetres(level, explode) + SLAB_THICKNESS_METRES;
    const segmentCount = wall.closed
      ? wall.points.length
      : Math.max(wall.points.length - 1, 0);
    const perimeter =
      wall.kind === "structural" &&
      wall.closed &&
      (wall.id === `wall-outline-${wall.levelId}` ||
        ringsEqual(wall.points, level.outline) ||
        ringsEqual(wall.points, projection.outline));

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const start = wall.points[segmentIndex];
      const end = wall.points[(segmentIndex + 1) % wall.points.length];
      if (!start || !end) continue;

      const feature = polygon(
        thickenPolyline([start, end], Math.max(wall.thickness, 1), false),
        projection,
        {
          wallId: wall.id,
          levelId: wall.levelId,
          kind: wall.kind,
          perimeter,
          base,
          // The generated footprint is a registration outline, not a modelled
          // external wall. Keep it as a low rim so it cannot become a box
          // around the floor; authored walls retain their full storey height.
          height: perimeter
            ? base + PERIMETER_RIM_HEIGHT_METRES
            : base + Math.max(level.heightMetres - ROOM_INSET_METRES, 0.5),
          active,
        },
        `${wall.id}:${segmentIndex}`,
      );
      if (feature) walls.push(feature);
    }

    for (const opening of wall.openings) {
      const feature = polygon(
        openingMarkerRing(wall, opening),
        projection,
        {
          openingId: opening.id,
          wallId: wall.id,
          levelId: wall.levelId,
          kind: opening.kind,
          exterior: opening.exterior === true,
          spaceId: opening.spaceId ?? "",
          base,
          height: base + OPENING_MARKER_HEIGHT_METRES,
          active,
        },
        opening.id,
      );
      if (feature) openings.push(feature);
    }
  }

  for (const connector of document.connectors) {
    const served = connector.levelIds
      .flatMap((levelId) => {
        const level = levelsById.get(levelId);
        return level ? [level] : [];
      })
      .sort((left, right) => left.number - right.number);
    const visibleServed =
      showInactiveLevels || activeLevelId === null
        ? served
        : served.filter((level) => level.id === activeLevelId);
    if (visibleServed.length === 0) continue;

    const levelExtents = visibleServed.map((level) => ({
      bottom: levelBaseMetres(level, explode),
      top:
        levelBaseMetres(level, explode) +
        (level.heightMetres || DEFAULT_LEVEL_HEIGHT_METRES),
    }));
    const bottom = Math.min(...levelExtents.map((extent) => extent.bottom));
    const top = showInactiveLevels
      ? Math.max(...levelExtents.map((extent) => extent.top))
      : bottom + 0.6;

    // A lift or a stairwell is one shaft through every floor it serves, so it
    // reads as the way up rather than a mark repeated on each floor.
    const size = 12;
    const shaft = polygon(
      [
        { x: connector.position.x - size, y: connector.position.y - size },
        { x: connector.position.x + size, y: connector.position.y - size },
        { x: connector.position.x + size, y: connector.position.y + size },
        { x: connector.position.x - size, y: connector.position.y + size },
      ],
      projection,
      {
        connectorId: connector.id,
        kind: connector.kind,
        name: connector.name,
        accessibility: connector.accessibility,
        base: bottom,
        height: top,
      },
      connector.id,
    );
    if (shaft) connectors.push(shaft);
  }

  const nodes = new Map(document.routeNodes.map((node) => [node.id, node]));
  const verticalConnectorIds = new Set<string>();
  for (const edge of document.routeEdges) {
    if (!routeEdgeIds.has(edge.id)) continue;
    const from = nodes.get(edge.fromNodeId);
    const to = nodes.get(edge.toNodeId);
    if (!from || !to) continue;

    const fromLevel = levelsById.get(from.levelId);
    const toLevel = levelsById.get(to.levelId);
    if (!fromLevel || !toLevel) continue;
    if (
      !showInactiveLevels &&
      (fromLevel.id !== activeLevelId || toLevel.id !== activeLevelId)
    ) {
      continue;
    }

    if (fromLevel.id !== toLevel.id) {
      // The way up is the shaft itself, lit along its whole length, rather
      // than a line drawn through the middle of the building.
      const connectorId = from.connectorId ?? to.connectorId;
      if (connectorId) verticalConnectorIds.add(connectorId);
      continue;
    }

    // Route segments are extruded ribbons rather than lines, because a map
    // line cannot be lifted to a floor's height.
    const base = levelBaseMetres(fromLevel, explode) + SLAB_THICKNESS_METRES;
    const feature = polygon(
      thickenPolyline([from.position, to.position], ROUTE_WIDTH_UNITS, false),
      projection,
      {
        edgeId: edge.id,
        routeNodeId: from.id,
        kind: edge.kind,
        levelId: from.levelId,
        base,
        height: base + ROUTE_HEIGHT_METRES,
        active: activeLevelId === null || from.levelId === activeLevelId,
      },
      edge.id,
    );
    if (feature) route.push(feature);
  }

  const litConnectors = connectors.map((feature) =>
    verticalConnectorIds.has(String(feature.properties.connectorId))
      ? { ...feature, properties: { ...feature.properties, onRoute: true } }
      : feature,
  );

  const topMetres = levels.reduce(
    (highest, level) =>
      Math.max(
        highest,
        levelBaseMetres(level, explode) +
          (level.heightMetres || DEFAULT_LEVEL_HEIGHT_METRES),
      ),
    0,
  );

  return {
    slabs: collection(slabs),
    rooms: collection(rooms),
    walls: collection(walls),
    openings: collection(openings),
    connectors: collection(litConnectors),
    route: collection(route),
    labels: collection(labels),
    topMetres,
  };
}
