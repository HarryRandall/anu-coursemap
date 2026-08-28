import {
  indoorGeometryBounds,
  indoorGeometryRing,
  isIndoorRingWithinPolygon,
  isIndoorSegmentWithinPolygon,
  resizeIndoorGeometryToBounds,
  thickenPolyline,
  translateIndoorGeometry,
  type IndoorBounds,
} from "@/lib/rooms/indoor-geometry";
import {
  isIndoorRingWithinFootprint,
  isIndoorSegmentWithinFootprint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";
import {
  insertWallVertex,
  moveWallVertex,
  removeWallVertex,
} from "@/lib/rooms/indoor-walls";
import type {
  CampusIndoorConnector,
  CampusIndoorDocument,
  CampusIndoorLevel,
  CampusIndoorSpace,
  CampusIndoorWall,
  CampusIndoorWallOpening,
  IndoorPoint,
  IndoorSpaceGeometry,
} from "@/lib/rooms/indoor-map";

/**
 * The floor plan editor's authored state.
 *
 * The reducer stores the document an author actually drew. The route graph is
 * derived from it by a memoised selector keyed on {@link routingSignature}, so
 * renaming a room cannot trigger a graph rebuild. Nothing here imports React or
 * touches the DOM, which is what makes it testable.
 *
 * Imported only from the admin editor.
 */

export type IndoorSelection = Readonly<{
  kind: "space" | "wall" | "connector" | "opening" | "route-node";
  id: string;
}> | null;

export type IndoorEditorState = Readonly<{
  document: CampusIndoorDocument;
  /** The real multi-part boundary, including courtyards and annexes. */
  footprint: IndoorFootprintProjection | null;
  name: string;
  levelId: string;
  selection: IndoorSelection;
  dirty: boolean;
  past: readonly IndoorEditorSnapshot[];
  future: readonly IndoorEditorSnapshot[];
  /** Set while consecutive text edits should collapse into one undo entry. */
  coalesceKey: string | null;
}>;

type IndoorEditorSnapshot = Readonly<{
  document: CampusIndoorDocument;
  name: string;
}>;

export type IndoorEditorAction =
  | { type: "select"; selection: IndoorSelection }
  | { type: "level/select"; levelId: string }
  | { type: "map/rename"; name: string }
  | { type: "level/add" }
  | { type: "level/remove"; levelId: string }
  | { type: "level/update"; levelId: string; patch: Partial<CampusIndoorLevel> }
  | { type: "space/add"; space: CampusIndoorSpace }
  | { type: "space/update"; id: string; patch: Partial<CampusIndoorSpace> }
  | { type: "space/geometry"; id: string; geometry: IndoorSpaceGeometry }
  | { type: "space/translate"; id: string; delta: IndoorPoint }
  | { type: "space/resize"; id: string; bounds: IndoorBounds }
  | { type: "wall/add"; wall: CampusIndoorWall }
  | { type: "wall/update"; id: string; patch: Partial<CampusIndoorWall> }
  | { type: "wall/vertex/move"; id: string; index: number; point: IndoorPoint }
  | {
      type: "wall/vertex/insert";
      id: string;
      segmentIndex: number;
      point: IndoorPoint;
    }
  | { type: "wall/vertex/remove"; id: string; index: number }
  | { type: "wall/translate"; id: string; delta: IndoorPoint }
  | { type: "opening/add"; wallId: string; opening: CampusIndoorWallOpening }
  | {
      type: "opening/update";
      id: string;
      patch: Partial<CampusIndoorWallOpening>;
    }
  | { type: "opening/remove"; id: string }
  | { type: "connector/add"; connector: CampusIndoorConnector }
  | {
      type: "connector/update";
      id: string;
      patch: Partial<CampusIndoorConnector>;
    }
  | { type: "connector/translate"; id: string; delta: IndoorPoint }
  | { type: "delete" }
  | {
      type: "document/replace";
      document: CampusIndoorDocument;
      dirty?: boolean;
    }
  | {
      type: "saved";
      document: CampusIndoorDocument;
      name: string;
      sourceDocument: CampusIndoorDocument;
      sourceName: string;
    }
  | { type: "undo" }
  | { type: "redo" };

const MAX_HISTORY = 50;
const DEFAULT_LEVEL_HEIGHT_METRES = 3.6;
const PERIMETER_WALL_THICKNESS = 2;
/** Connectors render as a 2.4 m square shaft. */
const CONNECTOR_HALF_SIZE_UNITS = 12;

function levelOutline(
  document: CampusIndoorDocument,
  levelId: string,
): readonly IndoorPoint[] | null {
  return document.levels.find((level) => level.id === levelId)?.outline ?? null;
}

function isGeneratedPerimeterWall(wall: CampusIndoorWall) {
  return wall.id === `wall-outline-${wall.levelId}`;
}

function spaceFitsLevel(
  document: CampusIndoorDocument,
  space: CampusIndoorSpace,
  footprint: IndoorFootprintProjection | null,
) {
  const outline = levelOutline(document, space.levelId);
  if (!outline) return false;
  const ring = indoorGeometryRing(space.geometry);
  return footprint
    ? isIndoorRingWithinFootprint(ring, footprint)
    : isIndoorRingWithinPolygon(ring, outline);
}

function wallFitsLevel(
  document: CampusIndoorDocument,
  wall: CampusIndoorWall,
  footprint: IndoorFootprintProjection | null,
) {
  const outline = levelOutline(document, wall.levelId);
  if (!outline) return false;
  if (isGeneratedPerimeterWall(wall)) {
    return (
      wall.kind === "structural" &&
      wall.closed &&
      wall.thickness === PERIMETER_WALL_THICKNESS &&
      wall.points.length === outline.length &&
      wall.points.every(
        (point, index) =>
          point.x === outline[index].x && point.y === outline[index].y,
      )
    );
  }

  const segmentCount = wall.closed
    ? wall.points.length
    : wall.points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const start = wall.points[index];
    const end = wall.points[(index + 1) % wall.points.length];
    const segmentFits = footprint
      ? isIndoorSegmentWithinFootprint(start, end, footprint)
      : isIndoorSegmentWithinPolygon(start, end, outline);
    if (!segmentFits) return false;
    const visibleWall = thickenPolyline(
      [start, end],
      Math.max(wall.thickness, 1),
      false,
    );
    const thicknessFits = footprint
      ? isIndoorRingWithinFootprint(visibleWall, footprint)
      : isIndoorRingWithinPolygon(visibleWall, outline);
    if (!thicknessFits) return false;
  }
  return true;
}

function connectorRing(position: IndoorPoint) {
  return [
    {
      x: position.x - CONNECTOR_HALF_SIZE_UNITS,
      y: position.y - CONNECTOR_HALF_SIZE_UNITS,
    },
    {
      x: position.x + CONNECTOR_HALF_SIZE_UNITS,
      y: position.y - CONNECTOR_HALF_SIZE_UNITS,
    },
    {
      x: position.x + CONNECTOR_HALF_SIZE_UNITS,
      y: position.y + CONNECTOR_HALF_SIZE_UNITS,
    },
    {
      x: position.x - CONNECTOR_HALF_SIZE_UNITS,
      y: position.y + CONNECTOR_HALF_SIZE_UNITS,
    },
  ];
}

function connectorFitsLevels(
  document: CampusIndoorDocument,
  connector: CampusIndoorConnector,
  footprint: IndoorFootprintProjection | null,
) {
  const ring = connectorRing(connector.position);
  return connector.levelIds.every((levelId) => {
    const outline = levelOutline(document, levelId);
    if (!outline) return false;
    return footprint
      ? isIndoorRingWithinFootprint(ring, footprint)
      : isIndoorRingWithinPolygon(ring, outline);
  });
}

export function createIndoorEditorState(
  document: CampusIndoorDocument,
  name: string,
  footprint: IndoorFootprintProjection | null = null,
): IndoorEditorState {
  return {
    document,
    footprint,
    name,
    levelId: document.levels[0]?.id ?? "",
    selection: null,
    dirty: false,
    past: [],
    future: [],
    coalesceKey: null,
  };
}

/**
 * A structural fingerprint of everything the route graph depends on.
 *
 * Names and references are deliberately excluded, so typing in a room name
 * cannot invalidate the graph. This is the whole fix for the editor rebuilding
 * its routes on every keystroke.
 */
export function routingSignature(document: CampusIndoorDocument): string {
  const parts: string[] = [
    String(document.viewBox.width),
    String(document.viewBox.height),
  ];

  for (const level of document.levels) {
    parts.push(`L${level.id}:${level.number}:${level.elevationMetres}`);
  }
  for (const wall of document.walls) {
    parts.push(
      `W${wall.id}:${wall.levelId}:${wall.closed ? 1 : 0}:${wall.points
        .map((point) => `${point.x},${point.y}`)
        .join(";")}`,
    );
    for (const opening of wall.openings) {
      parts.push(
        `O${opening.id}:${opening.segmentIndex}:${opening.offset}:${opening.width}:${opening.kind}:${opening.accessibility}:${opening.spaceId ?? ""}:${opening.exterior ? 1 : 0}`,
      );
    }
  }
  for (const space of document.spaces) {
    parts.push(
      `S${space.id}:${space.levelId}:${space.kind}:${space.searchable ? 1 : 0}:${JSON.stringify(space.geometry)}`,
    );
  }
  for (const connector of document.connectors) {
    parts.push(
      `C${connector.id}:${connector.kind}:${connector.accessibility}:${connector.levelIds.join(",")}:${connector.position.x},${connector.position.y}`,
    );
  }
  for (const node of document.routeNodes) {
    if (node.openingId) continue;
    parts.push(
      `N${node.id}:${node.levelId}:${node.kind}:${node.position.x},${node.position.y}:${node.spaceId ?? ""}:${node.accessibility ?? ""}`,
    );
  }
  for (const edge of document.routeEdges) {
    parts.push(
      `E${edge.id}:${edge.fromNodeId}:${edge.toNodeId}:${edge.kind}:${edge.accessibility}`,
    );
  }
  return parts.join("|");
}

function pushHistory(
  state: IndoorEditorState,
  coalesceKey: string | null = null,
): Pick<IndoorEditorState, "past" | "future" | "dirty" | "coalesceKey"> {
  // Consecutive edits under the same key collapse, so naming a room does not
  // leave one undo entry per keystroke.
  if (coalesceKey !== null && state.coalesceKey === coalesceKey) {
    return { past: state.past, future: [], dirty: true, coalesceKey };
  }
  const snapshot: IndoorEditorSnapshot = {
    document: state.document,
    name: state.name,
  };
  return {
    past: [...state.past, snapshot].slice(-MAX_HISTORY),
    future: [],
    dirty: true,
    coalesceKey,
  };
}

function withDocument(
  state: IndoorEditorState,
  document: CampusIndoorDocument,
  coalesceKey: string | null = null,
): IndoorEditorState {
  return { ...state, ...pushHistory(state, coalesceKey), document };
}

function mapWall(
  document: CampusIndoorDocument,
  id: string,
  change: (wall: CampusIndoorWall) => CampusIndoorWall,
): CampusIndoorDocument {
  return {
    ...document,
    walls: document.walls.map((wall) => (wall.id === id ? change(wall) : wall)),
  };
}

function findOpeningWall(document: CampusIndoorDocument, openingId: string) {
  return document.walls.find((wall) =>
    wall.openings.some((opening) => opening.id === openingId),
  );
}

/** Removes everything that belongs to a level, so nothing dangles. */
function removeLevel(
  document: CampusIndoorDocument,
  levelId: string,
): CampusIndoorDocument {
  const removedNodeIds = new Set(
    document.routeNodes
      .filter((node) => node.levelId === levelId)
      .map((node) => node.id),
  );
  const connectors = document.connectors
    .map((connector) => ({
      ...connector,
      levelIds: connector.levelIds.filter((id) => id !== levelId),
    }))
    .filter((connector) => connector.levelIds.length > 0);

  return {
    ...document,
    levels: document.levels.filter((level) => level.id !== levelId),
    walls: document.walls.filter((wall) => wall.levelId !== levelId),
    spaces: document.spaces.filter((space) => space.levelId !== levelId),
    connectors,
    routeNodes: document.routeNodes.filter((node) => node.levelId !== levelId),
    routeEdges: document.routeEdges.filter(
      (edge) =>
        !removedNodeIds.has(edge.fromNodeId) &&
        !removedNodeIds.has(edge.toNodeId),
    ),
  };
}

function nextLevel(
  document: CampusIndoorDocument,
  id: string,
  footprint: IndoorFootprintProjection | null,
): CampusIndoorLevel {
  const highest = document.levels.reduce(
    (current, level) => Math.max(current, level.number),
    -1,
  );
  const number = highest + 1;
  const template =
    document.levels.at(-1)?.outline ??
    footprint?.outline ??
    ([
      { x: 0, y: 0 },
      { x: document.viewBox.width, y: 0 },
      { x: document.viewBox.width, y: document.viewBox.height },
      { x: 0, y: document.viewBox.height },
    ] as const);

  return {
    id,
    number,
    ref: number === 0 ? "G" : String(number),
    name: number === 0 ? "Ground floor" : `Level ${number}`,
    elevationMetres: number * DEFAULT_LEVEL_HEIGHT_METRES,
    heightMetres: DEFAULT_LEVEL_HEIGHT_METRES,
    outline: template.map((point) => ({ ...point })),
  };
}

export function indoorEditorReducer(
  state: IndoorEditorState,
  action: IndoorEditorAction,
): IndoorEditorState {
  switch (action.type) {
    case "select":
      return { ...state, selection: action.selection, coalesceKey: null };

    case "level/select":
      return {
        ...state,
        levelId: action.levelId,
        selection: null,
        coalesceKey: null,
      };

    case "map/rename":
      return {
        ...state,
        ...pushHistory(state, "map/rename"),
        name: action.name,
      };

    case "level/add": {
      const level = nextLevel(
        state.document,
        nextLevelId(state),
        state.footprint,
      );
      const perimeter: CampusIndoorWall = {
        id: `wall-outline-${level.id}`,
        levelId: level.id,
        kind: "structural",
        points: level.outline.map((point) => ({ ...point })),
        thickness: PERIMETER_WALL_THICKNESS,
        closed: true,
        openings: [],
      };
      return {
        ...withDocument(state, {
          ...state.document,
          levels: [...state.document.levels, level],
          walls: [...state.document.walls, perimeter],
        }),
        levelId: level.id,
        selection: null,
      };
    }

    case "level/remove": {
      const document = removeLevel(state.document, action.levelId);
      return {
        ...withDocument(state, document),
        levelId:
          state.levelId === action.levelId
            ? (document.levels[0]?.id ?? "")
            : state.levelId,
        selection: null,
      };
    }

    case "level/update":
      return withDocument(
        state,
        {
          ...state.document,
          levels: state.document.levels.map((level) =>
            level.id === action.levelId ? { ...level, ...action.patch } : level,
          ),
        },
        `level/update:${action.levelId}`,
      );

    case "space/add":
      if (!spaceFitsLevel(state.document, action.space, state.footprint)) {
        return state;
      }
      return {
        ...withDocument(state, {
          ...state.document,
          spaces: [...state.document.spaces, action.space],
        }),
        selection: { kind: "space", id: action.space.id },
      };

    case "space/update": {
      const current = state.document.spaces.find(
        (space) => space.id === action.id,
      );
      if (!current) return state;
      const candidate = { ...current, ...action.patch };
      if (!spaceFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        {
          ...state.document,
          spaces: state.document.spaces.map((space) =>
            space.id === action.id ? { ...space, ...action.patch } : space,
          ),
        },
        `space/update:${action.id}`,
      );
    }

    case "space/geometry":
    case "space/translate":
    case "space/resize": {
      const current = state.document.spaces.find(
        (space) => space.id === action.id,
      );
      if (!current) return state;
      const geometry =
        action.type === "space/geometry"
          ? action.geometry
          : action.type === "space/translate"
            ? translateIndoorGeometry(current.geometry, action.delta)
            : resizeIndoorGeometryToBounds(current.geometry, action.bounds);
      const candidate = { ...current, geometry };
      if (!spaceFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(state, {
        ...state.document,
        spaces: state.document.spaces.map((space) => {
          if (space.id !== action.id) return space;
          return candidate;
        }),
      });
    }

    case "wall/add":
      if (!wallFitsLevel(state.document, action.wall, state.footprint)) {
        return state;
      }
      return {
        ...withDocument(state, {
          ...state.document,
          walls: [...state.document.walls, action.wall],
        }),
        selection: { kind: "wall", id: action.wall.id },
      };

    case "wall/update": {
      const current = state.document.walls.find(
        (wall) => wall.id === action.id,
      );
      if (!current) return state;
      const candidate = { ...current, ...action.patch };
      if (!wallFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        mapWall(state.document, action.id, () => candidate),
        `wall/update:${action.id}`,
      );
    }

    case "wall/vertex/move": {
      const current = state.document.walls.find(
        (wall) => wall.id === action.id,
      );
      if (!current) return state;
      const candidate = moveWallVertex(current, action.index, action.point);
      if (!wallFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        mapWall(state.document, action.id, () => candidate),
      );
    }

    case "wall/vertex/insert": {
      const current = state.document.walls.find(
        (wall) => wall.id === action.id,
      );
      if (!current) return state;
      const candidate = insertWallVertex(
        current,
        action.segmentIndex,
        action.point,
      );
      if (!wallFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        mapWall(state.document, action.id, () => candidate),
      );
    }

    case "wall/vertex/remove": {
      const current = state.document.walls.find(
        (wall) => wall.id === action.id,
      );
      if (!current) return state;
      const candidate = removeWallVertex(current, action.index);
      if (!wallFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        mapWall(state.document, action.id, () => candidate),
      );
    }

    case "wall/translate": {
      const current = state.document.walls.find(
        (wall) => wall.id === action.id,
      );
      if (!current) return state;
      const candidate = {
        ...current,
        points: current.points.map((point) => ({
          x: point.x + action.delta.x,
          y: point.y + action.delta.y,
        })),
      };
      if (!wallFitsLevel(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        mapWall(state.document, action.id, () => candidate),
      );
    }

    case "opening/add":
      return {
        ...withDocument(
          state,
          mapWall(state.document, action.wallId, (wall) => ({
            ...wall,
            openings: [...wall.openings, action.opening],
          })),
        ),
        selection: { kind: "opening", id: action.opening.id },
      };

    case "opening/update": {
      const wall = findOpeningWall(state.document, action.id);
      if (!wall) return state;
      return withDocument(
        state,
        mapWall(state.document, wall.id, (current) => ({
          ...current,
          openings: current.openings.map((opening) =>
            opening.id === action.id
              ? { ...opening, ...action.patch }
              : opening,
          ),
        })),
        `opening/update:${action.id}`,
      );
    }

    case "opening/remove": {
      const wall = findOpeningWall(state.document, action.id);
      if (!wall) return state;
      return {
        ...withDocument(
          state,
          mapWall(state.document, wall.id, (current) => ({
            ...current,
            openings: current.openings.filter(
              (opening) => opening.id !== action.id,
            ),
          })),
        ),
        selection: null,
      };
    }

    case "connector/add":
      if (
        !connectorFitsLevels(state.document, action.connector, state.footprint)
      ) {
        return state;
      }
      return {
        ...withDocument(state, {
          ...state.document,
          connectors: [...state.document.connectors, action.connector],
        }),
        selection: { kind: "connector", id: action.connector.id },
      };

    case "connector/update": {
      const current = state.document.connectors.find(
        (connector) => connector.id === action.id,
      );
      if (!current) return state;
      const candidate = { ...current, ...action.patch };
      if (!connectorFitsLevels(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(
        state,
        {
          ...state.document,
          connectors: state.document.connectors.map((connector) =>
            connector.id === action.id
              ? { ...connector, ...action.patch }
              : connector,
          ),
        },
        `connector/update:${action.id}`,
      );
    }

    case "connector/translate": {
      const current = state.document.connectors.find(
        (connector) => connector.id === action.id,
      );
      if (!current) return state;
      const candidate = {
        ...current,
        position: {
          x: current.position.x + action.delta.x,
          y: current.position.y + action.delta.y,
        },
      };
      if (!connectorFitsLevels(state.document, candidate, state.footprint)) {
        return state;
      }
      return withDocument(state, {
        ...state.document,
        connectors: state.document.connectors.map((connector) =>
          connector.id === action.id ? candidate : connector,
        ),
      });
    }

    case "delete": {
      const selection = state.selection;
      if (!selection) return state;
      if (selection.kind === "opening") {
        return indoorEditorReducer(state, {
          type: "opening/remove",
          id: selection.id,
        });
      }

      if (
        selection.kind === "wall" &&
        state.document.walls.some(
          (wall) => wall.id === selection.id && isGeneratedPerimeterWall(wall),
        )
      ) {
        return state;
      }

      const document = state.document;
      const next =
        selection.kind === "space"
          ? {
              ...document,
              spaces: document.spaces.filter(
                (space) => space.id !== selection.id,
              ),
              // Openings lose the room they served rather than dangling.
              walls: document.walls.map((wall) => ({
                ...wall,
                openings: wall.openings.map((opening) =>
                  opening.spaceId === selection.id
                    ? { ...opening, spaceId: undefined }
                    : opening,
                ),
              })),
            }
          : selection.kind === "wall"
            ? {
                ...document,
                walls: document.walls.filter(
                  (wall) => wall.id !== selection.id,
                ),
              }
            : selection.kind === "connector"
              ? {
                  ...document,
                  connectors: document.connectors.filter(
                    (connector) => connector.id !== selection.id,
                  ),
                }
              : {
                  ...document,
                  routeNodes: document.routeNodes.filter(
                    (node) => node.id !== selection.id,
                  ),
                  routeEdges: document.routeEdges.filter(
                    (edge) =>
                      edge.fromNodeId !== selection.id &&
                      edge.toNodeId !== selection.id,
                  ),
                };

      return { ...withDocument(state, next), selection: null };
    }

    case "document/replace":
      return {
        ...state,
        ...pushHistory(state),
        document: action.document,
        dirty: action.dirty ?? true,
        selection: null,
        levelId: action.document.levels.some(
          (level) => level.id === state.levelId,
        )
          ? state.levelId
          : (action.document.levels[0]?.id ?? ""),
      };

    case "saved":
      if (
        state.document !== action.sourceDocument ||
        state.name !== action.sourceName
      ) {
        return {
          ...state,
          dirty: true,
          coalesceKey: null,
        };
      }
      return {
        ...state,
        document: action.document,
        name: action.name,
        dirty: false,
        coalesceKey: null,
      };

    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        document: previous.document,
        name: previous.name,
        past: state.past.slice(0, -1),
        future: [
          { document: state.document, name: state.name },
          ...state.future,
        ],
        dirty: true,
        selection: null,
        coalesceKey: null,
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        document: next.document,
        name: next.name,
        past: [...state.past, { document: state.document, name: state.name }],
        future: state.future.slice(1),
        dirty: true,
        selection: null,
        coalesceKey: null,
      };
    }

    default:
      return state;
  }
}

/** An unused identifier for a level about to be added. */
function nextLevelId(state: IndoorEditorState) {
  const used = new Set(state.document.levels.map((level) => level.id));
  let index = state.document.levels.length;
  let candidate = `level-${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `level-${index}`;
  }
  return candidate;
}

/** Bounds of everything drawn on one level, for zoom-to-fit. */
export function levelContentBounds(
  document: CampusIndoorDocument,
  levelId: string,
): IndoorBounds | null {
  const level = document.levels.find((candidate) => candidate.id === levelId);
  if (!level || level.outline.length === 0) return null;

  return document.spaces
    .filter((space) => space.levelId === levelId)
    .map((space) => indoorGeometryBounds(space.geometry))
    .reduce<IndoorBounds>(
      (current, bounds) => ({
        minX: Math.min(current.minX, bounds.minX),
        minY: Math.min(current.minY, bounds.minY),
        maxX: Math.max(current.maxX, bounds.maxX),
        maxY: Math.max(current.maxY, bounds.maxY),
      }),
      level.outline.reduce<IndoorBounds>(
        (current, point) => ({
          minX: Math.min(current.minX, point.x),
          minY: Math.min(current.minY, point.y),
          maxX: Math.max(current.maxX, point.x),
          maxY: Math.max(current.maxY, point.y),
        }),
        {
          minX: level.outline[0].x,
          minY: level.outline[0].y,
          maxX: level.outline[0].x,
          maxY: level.outline[0].y,
        },
      ),
    );
}
