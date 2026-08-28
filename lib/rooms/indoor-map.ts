export const CAMPUS_INDOOR_DOCUMENT_VERSION = 1 as const;

export type IndoorAccessibility = "unknown" | "accessible" | "inaccessible";

export type IndoorPoint = Readonly<{
  x: number;
  y: number;
}>;

export type CampusIndoorViewBox = Readonly<{
  width: number;
  height: number;
}>;

export type CampusIndoorLevel = Readonly<{
  id: string;
  number: number;
  ref: string;
  name: string;
  elevationMetres: number;
  heightMetres: number;
  outline: readonly IndoorPoint[];
}>;

export type IndoorRectangleGeometry = Readonly<{
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}>;

export type IndoorEllipseGeometry = Readonly<{
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}>;

export type IndoorPolygonGeometry = Readonly<{
  type: "polygon";
  points: readonly IndoorPoint[];
}>;

export type IndoorSpaceGeometry =
  IndoorRectangleGeometry | IndoorEllipseGeometry | IndoorPolygonGeometry;

export type IndoorSpaceKind =
  "room" | "corridor" | "open-area" | "service" | "void";

export type CampusIndoorSpace = Readonly<{
  id: string;
  levelId: string;
  kind: IndoorSpaceKind;
  ref: string;
  name: string;
  searchable: boolean;
  geometry: IndoorSpaceGeometry;
}>;

export type IndoorConnectorKind = "stairs" | "lift" | "escalator" | "ramp";

export type CampusIndoorConnector = Readonly<{
  id: string;
  kind: IndoorConnectorKind;
  name: string;
  levelIds: readonly string[];
  position: IndoorPoint;
  accessibility: IndoorAccessibility;
}>;

export type IndoorRouteNodeKind =
  "entrance" | "door" | "junction" | "connector";

export type CampusIndoorRouteNode = Readonly<{
  id: string;
  levelId: string;
  kind: IndoorRouteNodeKind;
  position: IndoorPoint;
  connectorId?: string;
}>;

export type IndoorRouteEdgeKind =
  "walking" | "stairs" | "lift" | "escalator" | "ramp";

export type CampusIndoorRouteEdge = Readonly<{
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: IndoorRouteEdgeKind;
  bidirectional: boolean;
  distanceMetres: number;
  accessibility: IndoorAccessibility;
}>;

export type CampusIndoorDocument = Readonly<{
  version: typeof CAMPUS_INDOOR_DOCUMENT_VERSION;
  viewBox: CampusIndoorViewBox;
  levels: readonly CampusIndoorLevel[];
  spaces: readonly CampusIndoorSpace[];
  connectors: readonly CampusIndoorConnector[];
  routeNodes: readonly CampusIndoorRouteNode[];
  routeEdges: readonly CampusIndoorRouteEdge[];
}>;

export type IndoorRoomDetail = Readonly<{
  id: string;
  spaceId: string;
  levelId: string;
  levelNumber: number;
  levelRef: string;
  levelName: string;
  ref: string;
  name: string;
  label: string;
  geometry: IndoorSpaceGeometry;
}>;

export type IndoorRouteOptions = Readonly<{
  accessibleOnly?: boolean;
}>;

export type CampusIndoorRoute = Readonly<{
  nodeIds: readonly string[];
  edgeIds: readonly string[];
  levelIds: readonly string[];
  distanceMetres: number;
}>;

const DEFAULT_CAMPUS_INDOOR_VIEW_BOX: CampusIndoorViewBox = {
  width: 1000,
  height: 1000,
};

const IDENTIFIER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]*[A-Za-z0-9])?$/;
const MAX_IDENTIFIER_LENGTH = 128;
const INDOOR_METRES_PER_LOCAL_UNIT = 0.1;
const MINIMUM_ROUTE_DISTANCE_METRES = 0.01;

type UnknownRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: UnknownRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasExactKeys(
  record: UnknownRecord,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
) {
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(record);
  return (
    requiredKeys.every((key) => hasOwn(record, key)) &&
    keys.every((key) => allowedKeys.has(key))
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pointsEqual(left: IndoorPoint, right: IndoorPoint) {
  return left.x === right.x && left.y === right.y;
}

function normalisePolygonPoints(points: readonly IndoorPoint[]) {
  if (points.length > 3 && pointsEqual(points[0], points.at(-1)!)) {
    return points.slice(0, -1);
  }
  return points;
}

function crossProduct(
  start: IndoorPoint,
  middle: IndoorPoint,
  end: IndoorPoint,
) {
  return (
    (middle.x - start.x) * (end.y - start.y) -
    (middle.y - start.y) * (end.x - start.x)
  );
}

function pointIsOnSegment(
  point: IndoorPoint,
  start: IndoorPoint,
  end: IndoorPoint,
) {
  return (
    crossProduct(start, end, point) === 0 &&
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  );
}

function segmentsIntersect(
  firstStart: IndoorPoint,
  firstEnd: IndoorPoint,
  secondStart: IndoorPoint,
  secondEnd: IndoorPoint,
) {
  const firstStartSide = crossProduct(firstStart, firstEnd, secondStart);
  const firstEndSide = crossProduct(firstStart, firstEnd, secondEnd);
  const secondStartSide = crossProduct(secondStart, secondEnd, firstStart);
  const secondEndSide = crossProduct(secondStart, secondEnd, firstEnd);

  if (
    ((firstStartSide > 0 && firstEndSide < 0) ||
      (firstStartSide < 0 && firstEndSide > 0)) &&
    ((secondStartSide > 0 && secondEndSide < 0) ||
      (secondStartSide < 0 && secondEndSide > 0))
  ) {
    return true;
  }

  return (
    (firstStartSide === 0 &&
      pointIsOnSegment(secondStart, firstStart, firstEnd)) ||
    (firstEndSide === 0 && pointIsOnSegment(secondEnd, firstStart, firstEnd)) ||
    (secondStartSide === 0 &&
      pointIsOnSegment(firstStart, secondStart, secondEnd)) ||
    (secondEndSide === 0 && pointIsOnSegment(firstEnd, secondStart, secondEnd))
  );
}

function hasSelfIntersection(points: readonly IndoorPoint[]) {
  for (let firstIndex = 0; firstIndex < points.length; firstIndex++) {
    const firstNextIndex = (firstIndex + 1) % points.length;
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < points.length;
      secondIndex++
    ) {
      const secondNextIndex = (secondIndex + 1) % points.length;
      const segmentsAreAdjacent =
        firstIndex === secondIndex ||
        firstNextIndex === secondIndex ||
        secondNextIndex === firstIndex;
      if (segmentsAreAdjacent) continue;

      if (
        segmentsIntersect(
          points[firstIndex],
          points[firstNextIndex],
          points[secondIndex],
          points[secondNextIndex],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function polygonArea(points: readonly IndoorPoint[]) {
  return Math.abs(
    points.reduce((sum, point, index) => {
      const nextPoint = points[(index + 1) % points.length];
      return sum + point.x * nextPoint.y - nextPoint.x * point.y;
    }, 0) / 2,
  );
}

export function isIndoorPoint(value: unknown): value is IndoorPoint {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, ["x", "y"]) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y)
  );
}

export function isValidIndoorPolygonPoints(
  value: unknown,
): value is readonly IndoorPoint[] {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    !value.every(isIndoorPoint)
  ) {
    return false;
  }

  const points = normalisePolygonPoints(value);
  if (points.length < 3) return false;
  if (
    points.some((point, index) =>
      pointsEqual(point, points[(index + 1) % points.length]),
    )
  ) {
    return false;
  }

  return polygonArea(points) > 0 && !hasSelfIntersection(points);
}

export function isIndoorSpaceGeometry(
  value: unknown,
): value is IndoorSpaceGeometry {
  if (!isPlainRecord(value) || typeof value.type !== "string") return false;

  if (value.type === "rectangle") {
    return (
      hasExactKeys(value, [
        "type",
        "x",
        "y",
        "width",
        "height",
        "cornerRadius",
      ]) &&
      isFiniteNumber(value.x) &&
      isFiniteNumber(value.y) &&
      isFiniteNumber(value.width) &&
      value.width > 0 &&
      isFiniteNumber(value.height) &&
      value.height > 0 &&
      isFiniteNumber(value.cornerRadius) &&
      value.cornerRadius >= 0 &&
      value.cornerRadius <= Math.min(value.width, value.height) / 2
    );
  }

  if (value.type === "ellipse") {
    return (
      hasExactKeys(value, ["type", "cx", "cy", "rx", "ry"]) &&
      isFiniteNumber(value.cx) &&
      isFiniteNumber(value.cy) &&
      isFiniteNumber(value.rx) &&
      value.rx > 0 &&
      isFiniteNumber(value.ry) &&
      value.ry > 0
    );
  }

  return (
    value.type === "polygon" &&
    hasExactKeys(value, ["type", "points"]) &&
    isValidIndoorPolygonPoints(value.points)
  );
}

export function isIndoorPointWithinViewBox(
  point: IndoorPoint,
  viewBox: CampusIndoorViewBox,
) {
  return (
    point.x >= 0 &&
    point.x <= viewBox.width &&
    point.y >= 0 &&
    point.y <= viewBox.height
  );
}

export function isIndoorGeometryWithinViewBox(
  geometry: IndoorSpaceGeometry,
  viewBox: CampusIndoorViewBox,
) {
  if (geometry.type === "rectangle") {
    return (
      geometry.x >= 0 &&
      geometry.y >= 0 &&
      geometry.x + geometry.width <= viewBox.width &&
      geometry.y + geometry.height <= viewBox.height
    );
  }

  if (geometry.type === "ellipse") {
    return (
      geometry.cx - geometry.rx >= 0 &&
      geometry.cy - geometry.ry >= 0 &&
      geometry.cx + geometry.rx <= viewBox.width &&
      geometry.cy + geometry.ry <= viewBox.height
    );
  }

  return geometry.points.every((point) =>
    isIndoorPointWithinViewBox(point, viewBox),
  );
}

function invalid(path: string, message: string): never {
  throw new TypeError(`Invalid campus indoor document at ${path}: ${message}`);
}

function expectRecord(value: unknown, path: string): UnknownRecord {
  if (!isPlainRecord(value)) invalid(path, "expected a plain object");
  return value;
}

function expectExactKeys(
  record: UnknownRecord,
  requiredKeys: readonly string[],
  path: string,
  optionalKeys: readonly string[] = [],
) {
  const missing = requiredKeys.filter((key) => !hasOwn(record, key));
  if (missing.length > 0) {
    invalid(path, `missing ${missing.map((key) => `'${key}'`).join(", ")}`);
  }

  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const unexpected = Object.keys(record).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    invalid(
      path,
      `unexpected ${unexpected.map((key) => `'${key}'`).join(", ")}`,
    );
  }
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(path, "expected an array");
  return value;
}

function expectString(value: unknown, path: string) {
  if (typeof value !== "string") invalid(path, "expected a string");
  return value;
}

function expectIdentifier(value: unknown, path: string) {
  const identifier = expectString(value, path);
  if (
    identifier.length > MAX_IDENTIFIER_LENGTH ||
    !IDENTIFIER_PATTERN.test(identifier)
  ) {
    invalid(
      path,
      "expected a non-empty identifier containing only letters, numbers, '.', '_', ':' or '-'",
    );
  }
  return identifier;
}

function expectNumber(value: unknown, path: string) {
  if (!isFiniteNumber(value)) invalid(path, "expected a finite number");
  return value;
}

function expectPositiveNumber(value: unknown, path: string) {
  const number = expectNumber(value, path);
  if (number <= 0) invalid(path, "expected a number greater than zero");
  return number;
}

function expectBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") invalid(path, "expected a boolean");
  return value;
}

function expectEnum<const Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  path: string,
): Value {
  if (typeof value !== "string" || !allowed.includes(value as Value)) {
    invalid(
      path,
      `expected one of ${allowed.map((item) => `'${item}'`).join(", ")}`,
    );
  }
  return value as Value;
}

function parsePoint(value: unknown, path: string): IndoorPoint {
  const point = expectRecord(value, path);
  expectExactKeys(point, ["x", "y"], path);
  return {
    x: expectNumber(point.x, `${path}.x`),
    y: expectNumber(point.y, `${path}.y`),
  };
}

function parsePolygonPoints(value: unknown, path: string) {
  const points = expectArray(value, path).map((point, index) =>
    parsePoint(point, `${path}[${index}]`),
  );
  if (!isValidIndoorPolygonPoints(points)) {
    invalid(path, "expected a simple polygon with at least three points");
  }
  return points;
}

function parseViewBox(value: unknown): CampusIndoorViewBox {
  const viewBox = expectRecord(value, "viewBox");
  expectExactKeys(viewBox, ["width", "height"], "viewBox");
  return {
    width: expectPositiveNumber(viewBox.width, "viewBox.width"),
    height: expectPositiveNumber(viewBox.height, "viewBox.height"),
  };
}

function parseLevel(
  value: unknown,
  index: number,
  viewBox: CampusIndoorViewBox,
): CampusIndoorLevel {
  const path = `levels[${index}]`;
  const level = expectRecord(value, path);
  expectExactKeys(
    level,
    [
      "id",
      "number",
      "ref",
      "name",
      "elevationMetres",
      "heightMetres",
      "outline",
    ],
    path,
  );
  const outline = parsePolygonPoints(level.outline, `${path}.outline`);
  if (!outline.every((point) => isIndoorPointWithinViewBox(point, viewBox))) {
    invalid(`${path}.outline`, "expected every point to be inside the viewBox");
  }

  return {
    id: expectIdentifier(level.id, `${path}.id`),
    number: expectNumber(level.number, `${path}.number`),
    ref: expectString(level.ref, `${path}.ref`),
    name: expectString(level.name, `${path}.name`),
    elevationMetres: expectNumber(
      level.elevationMetres,
      `${path}.elevationMetres`,
    ),
    heightMetres: expectPositiveNumber(
      level.heightMetres,
      `${path}.heightMetres`,
    ),
    outline,
  };
}

function parseSpaceGeometry(
  value: unknown,
  path: string,
  viewBox: CampusIndoorViewBox,
): IndoorSpaceGeometry {
  const geometry = expectRecord(value, path);
  const type = expectEnum(
    geometry.type,
    ["rectangle", "ellipse", "polygon"] as const,
    `${path}.type`,
  );

  let parsed: IndoorSpaceGeometry;
  if (type === "rectangle") {
    expectExactKeys(
      geometry,
      ["type", "x", "y", "width", "height", "cornerRadius"],
      path,
    );
    const width = expectPositiveNumber(geometry.width, `${path}.width`);
    const height = expectPositiveNumber(geometry.height, `${path}.height`);
    const cornerRadius = expectNumber(
      geometry.cornerRadius,
      `${path}.cornerRadius`,
    );
    if (cornerRadius < 0 || cornerRadius > Math.min(width, height) / 2) {
      invalid(
        `${path}.cornerRadius`,
        "expected a value between zero and half the shortest side",
      );
    }
    parsed = {
      type,
      x: expectNumber(geometry.x, `${path}.x`),
      y: expectNumber(geometry.y, `${path}.y`),
      width,
      height,
      cornerRadius,
    };
  } else if (type === "ellipse") {
    expectExactKeys(geometry, ["type", "cx", "cy", "rx", "ry"], path);
    parsed = {
      type,
      cx: expectNumber(geometry.cx, `${path}.cx`),
      cy: expectNumber(geometry.cy, `${path}.cy`),
      rx: expectPositiveNumber(geometry.rx, `${path}.rx`),
      ry: expectPositiveNumber(geometry.ry, `${path}.ry`),
    };
  } else {
    expectExactKeys(geometry, ["type", "points"], path);
    parsed = {
      type,
      points: parsePolygonPoints(geometry.points, `${path}.points`),
    };
  }

  if (!isIndoorGeometryWithinViewBox(parsed, viewBox)) {
    invalid(path, "expected the complete geometry to be inside the viewBox");
  }
  return parsed;
}

function parseSpace(
  value: unknown,
  index: number,
  viewBox: CampusIndoorViewBox,
): CampusIndoorSpace {
  const path = `spaces[${index}]`;
  const space = expectRecord(value, path);
  expectExactKeys(
    space,
    ["id", "levelId", "kind", "ref", "name", "searchable", "geometry"],
    path,
  );
  return {
    id: expectIdentifier(space.id, `${path}.id`),
    levelId: expectIdentifier(space.levelId, `${path}.levelId`),
    kind: expectEnum(
      space.kind,
      ["room", "corridor", "open-area", "service", "void"] as const,
      `${path}.kind`,
    ),
    ref: expectString(space.ref, `${path}.ref`),
    name: expectString(space.name, `${path}.name`),
    searchable: expectBoolean(space.searchable, `${path}.searchable`),
    geometry: parseSpaceGeometry(space.geometry, `${path}.geometry`, viewBox),
  };
}

function parseAccessibility(value: unknown, path: string) {
  return expectEnum(
    value,
    ["unknown", "accessible", "inaccessible"] as const,
    path,
  );
}

function parseConnector(
  value: unknown,
  index: number,
  viewBox: CampusIndoorViewBox,
): CampusIndoorConnector {
  const path = `connectors[${index}]`;
  const connector = expectRecord(value, path);
  expectExactKeys(
    connector,
    ["id", "kind", "name", "levelIds", "position", "accessibility"],
    path,
  );
  const levelIds = expectArray(connector.levelIds, `${path}.levelIds`).map(
    (levelId, levelIndex) =>
      expectIdentifier(levelId, `${path}.levelIds[${levelIndex}]`),
  );
  if (levelIds.length === 0) {
    invalid(`${path}.levelIds`, "expected at least one level identifier");
  }
  if (new Set(levelIds).size !== levelIds.length) {
    invalid(`${path}.levelIds`, "expected unique level identifiers");
  }
  const position = parsePoint(connector.position, `${path}.position`);
  if (!isIndoorPointWithinViewBox(position, viewBox)) {
    invalid(`${path}.position`, "expected a point inside the viewBox");
  }

  return {
    id: expectIdentifier(connector.id, `${path}.id`),
    kind: expectEnum(
      connector.kind,
      ["stairs", "lift", "escalator", "ramp"] as const,
      `${path}.kind`,
    ),
    name: expectString(connector.name, `${path}.name`),
    levelIds,
    position,
    accessibility: parseAccessibility(
      connector.accessibility,
      `${path}.accessibility`,
    ),
  };
}

function parseRouteNode(
  value: unknown,
  index: number,
  viewBox: CampusIndoorViewBox,
): CampusIndoorRouteNode {
  const path = `routeNodes[${index}]`;
  const node = expectRecord(value, path);
  expectExactKeys(node, ["id", "levelId", "kind", "position"], path, [
    "connectorId",
  ]);
  const kind = expectEnum(
    node.kind,
    ["entrance", "door", "junction", "connector"] as const,
    `${path}.kind`,
  );
  const connectorId = hasOwn(node, "connectorId")
    ? expectIdentifier(node.connectorId, `${path}.connectorId`)
    : undefined;
  if (kind === "connector" && !connectorId) {
    invalid(`${path}.connectorId`, "required for a connector route node");
  }
  if (kind !== "connector" && connectorId) {
    invalid(`${path}.connectorId`, "only valid for a connector route node");
  }
  const position = parsePoint(node.position, `${path}.position`);
  if (!isIndoorPointWithinViewBox(position, viewBox)) {
    invalid(`${path}.position`, "expected a point inside the viewBox");
  }

  return {
    id: expectIdentifier(node.id, `${path}.id`),
    levelId: expectIdentifier(node.levelId, `${path}.levelId`),
    kind,
    position,
    ...(connectorId ? { connectorId } : {}),
  };
}

function parseRouteEdge(value: unknown, index: number): CampusIndoorRouteEdge {
  const path = `routeEdges[${index}]`;
  const edge = expectRecord(value, path);
  expectExactKeys(
    edge,
    [
      "id",
      "fromNodeId",
      "toNodeId",
      "kind",
      "bidirectional",
      "distanceMetres",
      "accessibility",
    ],
    path,
  );
  return {
    id: expectIdentifier(edge.id, `${path}.id`),
    fromNodeId: expectIdentifier(edge.fromNodeId, `${path}.fromNodeId`),
    toNodeId: expectIdentifier(edge.toNodeId, `${path}.toNodeId`),
    kind: expectEnum(
      edge.kind,
      ["walking", "stairs", "lift", "escalator", "ramp"] as const,
      `${path}.kind`,
    ),
    bidirectional: expectBoolean(edge.bidirectional, `${path}.bidirectional`),
    distanceMetres: expectPositiveNumber(
      edge.distanceMetres,
      `${path}.distanceMetres`,
    ),
    accessibility: parseAccessibility(
      edge.accessibility,
      `${path}.accessibility`,
    ),
  };
}

function ensureUniqueIds(document: CampusIndoorDocument) {
  const ids = new Set<string>();
  const collections = [
    ["levels", document.levels],
    ["spaces", document.spaces],
    ["connectors", document.connectors],
    ["routeNodes", document.routeNodes],
    ["routeEdges", document.routeEdges],
  ] as const;

  for (const [collectionName, collection] of collections) {
    collection.forEach((item, index) => {
      if (ids.has(item.id)) {
        invalid(
          `${collectionName}[${index}].id`,
          `duplicate identifier '${item.id}'`,
        );
      }
      ids.add(item.id);
    });
  }
}

function validateReferences(document: CampusIndoorDocument) {
  const levels = new Set(document.levels.map((level) => level.id));
  const connectors = new Map(
    document.connectors.map((connector) => [connector.id, connector]),
  );
  const routeNodes = new Map(
    document.routeNodes.map((node) => [node.id, node]),
  );

  document.spaces.forEach((space, index) => {
    if (!levels.has(space.levelId)) {
      invalid(
        `spaces[${index}].levelId`,
        `unknown level identifier '${space.levelId}'`,
      );
    }
  });

  document.connectors.forEach((connector, connectorIndex) => {
    connector.levelIds.forEach((levelId, levelIndex) => {
      if (!levels.has(levelId)) {
        invalid(
          `connectors[${connectorIndex}].levelIds[${levelIndex}]`,
          `unknown level identifier '${levelId}'`,
        );
      }
    });
  });

  document.routeNodes.forEach((node, index) => {
    if (!levels.has(node.levelId)) {
      invalid(
        `routeNodes[${index}].levelId`,
        `unknown level identifier '${node.levelId}'`,
      );
    }
    if (!node.connectorId) return;

    const connector = connectors.get(node.connectorId);
    if (!connector) {
      invalid(
        `routeNodes[${index}].connectorId`,
        `unknown connector identifier '${node.connectorId}'`,
      );
    }
    if (!connector.levelIds.includes(node.levelId)) {
      invalid(
        `routeNodes[${index}].levelId`,
        `connector '${connector.id}' does not serve level '${node.levelId}'`,
      );
    }
  });

  document.routeEdges.forEach((edge, index) => {
    const fromNode = routeNodes.get(edge.fromNodeId);
    const toNode = routeNodes.get(edge.toNodeId);
    if (!fromNode) {
      invalid(
        `routeEdges[${index}].fromNodeId`,
        `unknown route node identifier '${edge.fromNodeId}'`,
      );
    }
    if (!toNode) {
      invalid(
        `routeEdges[${index}].toNodeId`,
        `unknown route node identifier '${edge.toNodeId}'`,
      );
    }
    if (fromNode.id === toNode.id) {
      invalid(
        `routeEdges[${index}]`,
        "expected different route nodes at each end",
      );
    }

    if (edge.kind === "walking") {
      if (fromNode.levelId !== toNode.levelId) {
        invalid(
          `routeEdges[${index}].kind`,
          "a walking edge cannot cross levels",
        );
      }
      return;
    }

    if (
      fromNode.kind !== "connector" ||
      toNode.kind !== "connector" ||
      !fromNode.connectorId ||
      fromNode.connectorId !== toNode.connectorId
    ) {
      invalid(
        `routeEdges[${index}]`,
        `a '${edge.kind}' edge must join route nodes for the same connector`,
      );
    }
    const connector = connectors.get(fromNode.connectorId);
    if (!connector || connector.kind !== edge.kind) {
      invalid(
        `routeEdges[${index}].kind`,
        `expected the edge kind to match connector '${fromNode.connectorId}'`,
      );
    }
  });
}

export function createEmptyCampusIndoorDocument(
  viewBox: CampusIndoorViewBox = DEFAULT_CAMPUS_INDOOR_VIEW_BOX,
): CampusIndoorDocument {
  if (
    !isFiniteNumber(viewBox.width) ||
    viewBox.width <= 0 ||
    !isFiniteNumber(viewBox.height) ||
    viewBox.height <= 0
  ) {
    throw new TypeError(
      "An empty campus indoor document requires a positive finite viewBox.",
    );
  }

  return {
    version: CAMPUS_INDOOR_DOCUMENT_VERSION,
    viewBox: { width: viewBox.width, height: viewBox.height },
    levels: [],
    spaces: [],
    connectors: [],
    routeNodes: [],
    routeEdges: [],
  };
}

export const EMPTY_CAMPUS_INDOOR_DOCUMENT = createEmptyCampusIndoorDocument();

export function parseCampusIndoorDocument(
  value: unknown,
): CampusIndoorDocument {
  const document = expectRecord(value, "document");
  expectExactKeys(
    document,
    [
      "version",
      "viewBox",
      "levels",
      "spaces",
      "connectors",
      "routeNodes",
      "routeEdges",
    ],
    "document",
  );
  if (document.version !== CAMPUS_INDOOR_DOCUMENT_VERSION) {
    invalid("version", `expected version ${CAMPUS_INDOOR_DOCUMENT_VERSION}`);
  }

  const viewBox = parseViewBox(document.viewBox);
  const parsed: CampusIndoorDocument = {
    version: CAMPUS_INDOOR_DOCUMENT_VERSION,
    viewBox,
    levels: expectArray(document.levels, "levels").map((level, index) =>
      parseLevel(level, index, viewBox),
    ),
    spaces: expectArray(document.spaces, "spaces").map((space, index) =>
      parseSpace(space, index, viewBox),
    ),
    connectors: expectArray(document.connectors, "connectors").map(
      (connector, index) => parseConnector(connector, index, viewBox),
    ),
    routeNodes: expectArray(document.routeNodes, "routeNodes").map(
      (node, index) => parseRouteNode(node, index, viewBox),
    ),
    routeEdges: expectArray(document.routeEdges, "routeEdges").map(
      parseRouteEdge,
    ),
  };

  ensureUniqueIds(parsed);
  validateReferences(parsed);
  return parsed;
}

const roomDetailCollator = new Intl.Collator("en-AU", {
  numeric: true,
  sensitivity: "base",
});

export function listIndoorRoomDetails(
  document: CampusIndoorDocument,
): readonly IndoorRoomDetail[] {
  const levels = new Map(document.levels.map((level) => [level.id, level]));

  return document.spaces
    .filter((space) => space.kind === "room" && space.searchable)
    .map((space) => {
      const level = levels.get(space.levelId);
      if (!level) {
        throw new TypeError(
          `Cannot list indoor rooms because space '${space.id}' refers to unknown level '${space.levelId}'.`,
        );
      }
      return {
        id: space.id,
        spaceId: space.id,
        levelId: level.id,
        levelNumber: level.number,
        levelRef: level.ref,
        levelName: level.name,
        ref: space.ref,
        name: space.name,
        label: space.name || space.ref || "Room",
        geometry: space.geometry,
      };
    })
    .sort(
      (left, right) =>
        left.levelNumber - right.levelNumber ||
        roomDetailCollator.compare(left.ref, right.ref) ||
        roomDetailCollator.compare(left.name, right.name) ||
        roomDetailCollator.compare(left.id, right.id),
    );
}

function compareIdentifiers(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareLevels(left: CampusIndoorLevel, right: CampusIndoorLevel) {
  return (
    left.number - right.number ||
    left.elevationMetres - right.elevationMetres ||
    compareIdentifiers(left.id, right.id)
  );
}

function geometryCentre(geometry: IndoorSpaceGeometry): IndoorPoint {
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

function generatedIdentifier(value: string, path: string) {
  if (value.length > MAX_IDENTIFIER_LENGTH || !IDENTIFIER_PATTERN.test(value)) {
    invalid(path, `generated identifier '${value}' is not valid`);
  }
  return value;
}

function roomRouteNodeId(spaceId: string) {
  return generatedIdentifier(`space-${spaceId}`, `spaces['${spaceId}'].id`);
}

function connectorRouteNodeId(connectorId: string, levelId: string) {
  return generatedIdentifier(
    `connector-${connectorId}-${levelId}`,
    `connectors['${connectorId}'].levelIds['${levelId}']`,
  );
}

function localDistanceMetres(left: IndoorPoint, right: IndoorPoint) {
  const distance =
    Math.hypot(right.x - left.x, right.y - left.y) *
    INDOOR_METRES_PER_LOCAL_UNIT;
  return Math.max(Number(distance.toFixed(3)), MINIMUM_ROUTE_DISTANCE_METRES);
}

type WalkingEdgeCandidate = Readonly<{
  from: CampusIndoorRouteNode;
  to: CampusIndoorRouteNode;
  distanceMetres: number;
}>;

function buildLevelWalkingEdges(
  levelNodes: readonly CampusIndoorRouteNode[],
  levelIndex: number,
): CampusIndoorRouteEdge[] {
  if (levelNodes.length < 2) return [];

  const nodes = [...levelNodes].sort((left, right) =>
    compareIdentifiers(left.id, right.id),
  );
  const candidates: WalkingEdgeCandidate[] = [];
  for (let fromIndex = 0; fromIndex < nodes.length; fromIndex++) {
    for (let toIndex = fromIndex + 1; toIndex < nodes.length; toIndex++) {
      candidates.push({
        from: nodes[fromIndex],
        to: nodes[toIndex],
        distanceMetres: localDistanceMetres(
          nodes[fromIndex].position,
          nodes[toIndex].position,
        ),
      });
    }
  }
  candidates.sort(
    (left, right) =>
      left.distanceMetres - right.distanceMetres ||
      compareIdentifiers(left.from.id, right.from.id) ||
      compareIdentifiers(left.to.id, right.to.id),
  );

  const parents = new Map(nodes.map((node) => [node.id, node.id]));
  function findRoot(nodeId: string): string {
    const parent = parents.get(nodeId)!;
    if (parent === nodeId) return parent;
    const root = findRoot(parent);
    parents.set(nodeId, root);
    return root;
  }

  const edges: CampusIndoorRouteEdge[] = [];
  for (const candidate of candidates) {
    const fromRoot = findRoot(candidate.from.id);
    const toRoot = findRoot(candidate.to.id);
    if (fromRoot === toRoot) continue;

    parents.set(toRoot, fromRoot);
    edges.push({
      id: generatedIdentifier(
        `walking-${levelIndex}-${edges.length}`,
        `levels[${levelIndex}].routeEdges[${edges.length}].id`,
      ),
      fromNodeId: candidate.from.id,
      toNodeId: candidate.to.id,
      kind: "walking",
      bidirectional: true,
      distanceMetres: candidate.distanceMetres,
      accessibility: "accessible",
    });
    if (edges.length === nodes.length - 1) break;
  }
  return edges;
}

function buildConnectorEdges(
  connector: CampusIndoorConnector,
  connectorIndex: number,
  levelsById: ReadonlyMap<string, CampusIndoorLevel>,
): CampusIndoorRouteEdge[] {
  const levels = connector.levelIds
    .map((levelId) => levelsById.get(levelId)!)
    .sort(compareLevels);

  return levels.slice(0, -1).map((level, levelIndex) => {
    const nextLevel = levels[levelIndex + 1];
    const elevationDistance = Math.abs(
      nextLevel.elevationMetres - level.elevationMetres,
    );
    const fallbackDistance = (level.heightMetres + nextLevel.heightMetres) / 2;
    return {
      id: generatedIdentifier(
        `vertical-${connectorIndex}-${levelIndex}`,
        `connectors[${connectorIndex}].routeEdges[${levelIndex}].id`,
      ),
      fromNodeId: connectorRouteNodeId(connector.id, level.id),
      toNodeId: connectorRouteNodeId(connector.id, nextLevel.id),
      kind: connector.kind,
      bidirectional: true,
      distanceMetres: Math.max(
        Number((elevationDistance || fallbackDistance).toFixed(3)),
        MINIMUM_ROUTE_DISTANCE_METRES,
      ),
      accessibility: connector.accessibility,
    };
  });
}

export function buildIndoorRouteGraph(
  document: CampusIndoorDocument,
): CampusIndoorDocument {
  const baseDocument = parseCampusIndoorDocument({
    ...document,
    routeNodes: [],
    routeEdges: [],
  });
  const levels = [...baseDocument.levels].sort(compareLevels);
  const levelsById = new Map(levels.map((level) => [level.id, level]));
  const roomNodes: CampusIndoorRouteNode[] = baseDocument.spaces
    .filter((space) => space.kind === "room" && space.searchable)
    .sort((left, right) => compareIdentifiers(left.id, right.id))
    .map((space) => ({
      id: roomRouteNodeId(space.id),
      levelId: space.levelId,
      kind: "junction",
      position: geometryCentre(space.geometry),
    }));
  const connectors = [...baseDocument.connectors].sort((left, right) =>
    compareIdentifiers(left.id, right.id),
  );
  const connectorNodes: CampusIndoorRouteNode[] = connectors.flatMap(
    (connector) =>
      connector.levelIds
        .map((levelId) => levelsById.get(levelId)!)
        .sort(compareLevels)
        .map((level) => ({
          id: connectorRouteNodeId(connector.id, level.id),
          levelId: level.id,
          kind: "connector" as const,
          position: connector.position,
          connectorId: connector.id,
        })),
  );
  const routeNodes = [...roomNodes, ...connectorNodes].sort((left, right) =>
    compareIdentifiers(left.id, right.id),
  );

  const walkingEdges = levels.flatMap((level, levelIndex) =>
    buildLevelWalkingEdges(
      routeNodes.filter((node) => node.levelId === level.id),
      levelIndex,
    ),
  );
  const connectorEdges = connectors.flatMap((connector, connectorIndex) =>
    buildConnectorEdges(connector, connectorIndex, levelsById),
  );

  return parseCampusIndoorDocument({
    ...baseDocument,
    routeNodes,
    routeEdges: [...walkingEdges, ...connectorEdges],
  });
}

type RouteTraversal = Readonly<{
  edge: CampusIndoorRouteEdge;
  toNodeId: string;
}>;

export function findIndoorRoute(
  document: CampusIndoorDocument,
  fromSpaceId: string,
  toSpaceId: string,
  options: IndoorRouteOptions = {},
): CampusIndoorRoute | null {
  const routedDocument = parseCampusIndoorDocument(document);
  const routableSpaces = new Map(
    routedDocument.spaces
      .filter((space) => space.kind === "room" && space.searchable)
      .map((space) => [space.id, space]),
  );
  if (!routableSpaces.has(fromSpaceId) || !routableSpaces.has(toSpaceId)) {
    return null;
  }

  const nodes = new Map(
    routedDocument.routeNodes.map((node) => [node.id, node]),
  );
  const sourceNodeId = roomRouteNodeId(fromSpaceId);
  const targetNodeId = roomRouteNodeId(toSpaceId);
  if (!nodes.has(sourceNodeId) || !nodes.has(targetNodeId)) return null;

  const adjacency = new Map<string, RouteTraversal[]>();
  routedDocument.routeNodes.forEach((node) => adjacency.set(node.id, []));
  routedDocument.routeEdges.forEach((edge) => {
    if (options.accessibleOnly && edge.accessibility !== "accessible") return;
    adjacency.get(edge.fromNodeId)!.push({ edge, toNodeId: edge.toNodeId });
    if (edge.bidirectional) {
      adjacency.get(edge.toNodeId)!.push({
        edge,
        toNodeId: edge.fromNodeId,
      });
    }
  });
  adjacency.forEach((traversals) =>
    traversals.sort(
      (left, right) =>
        compareIdentifiers(left.toNodeId, right.toNodeId) ||
        compareIdentifiers(left.edge.id, right.edge.id),
    ),
  );

  const nodeIds = [...nodes.keys()].sort((left, right) =>
    compareIdentifiers(left, right),
  );
  const unsettled = new Set(nodeIds);
  const distances = new Map(nodeIds.map((nodeId) => [nodeId, Infinity]));
  const previous = new Map<
    string,
    Readonly<{ nodeId: string; edgeId: string }>
  >();
  distances.set(sourceNodeId, 0);

  while (unsettled.size > 0) {
    let currentNodeId: string | null = null;
    let currentDistance = Infinity;
    for (const nodeId of nodeIds) {
      if (!unsettled.has(nodeId)) continue;
      const distance = distances.get(nodeId)!;
      if (distance < currentDistance) {
        currentNodeId = nodeId;
        currentDistance = distance;
      }
    }
    if (!currentNodeId || !Number.isFinite(currentDistance)) break;
    unsettled.delete(currentNodeId);
    if (currentNodeId === targetNodeId) break;

    for (const traversal of adjacency.get(currentNodeId) ?? []) {
      if (!unsettled.has(traversal.toNodeId)) continue;
      const candidateDistance = currentDistance + traversal.edge.distanceMetres;
      if (candidateDistance < distances.get(traversal.toNodeId)!) {
        distances.set(traversal.toNodeId, candidateDistance);
        previous.set(traversal.toNodeId, {
          nodeId: currentNodeId,
          edgeId: traversal.edge.id,
        });
      }
    }
  }

  const distanceMetres = distances.get(targetNodeId)!;
  if (!Number.isFinite(distanceMetres)) return null;

  const routeNodeIds = [targetNodeId];
  const routeEdgeIds: string[] = [];
  let currentNodeId = targetNodeId;
  while (currentNodeId !== sourceNodeId) {
    const preceding = previous.get(currentNodeId);
    if (!preceding) return null;
    routeEdgeIds.unshift(preceding.edgeId);
    routeNodeIds.unshift(preceding.nodeId);
    currentNodeId = preceding.nodeId;
  }

  const levelIds: string[] = [];
  const seenLevelIds = new Set<string>();
  routeNodeIds.forEach((nodeId) => {
    const levelId = nodes.get(nodeId)!.levelId;
    if (!seenLevelIds.has(levelId)) {
      seenLevelIds.add(levelId);
      levelIds.push(levelId);
    }
  });

  return {
    nodeIds: routeNodeIds,
    edgeIds: routeEdgeIds,
    levelIds,
    distanceMetres: Number(distanceMetres.toFixed(3)),
  };
}
