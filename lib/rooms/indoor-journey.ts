import {
  findIndoorRouteFromNode,
  type CampusIndoorDocument,
  type CampusIndoorRoute,
  type IndoorAccessibility,
  type IndoorConnectorKind,
  type IndoorPoint,
} from "@/lib/rooms/indoor-map";

/**
 * Turns an indoor route into the steps a person actually takes: walk in at an
 * entrance, cross a floor, take the lift or the stairs, cross the next floor.
 *
 * The public room finder renders these as a stepper, and each step drives both
 * the floor shown and the camera, so the model has to carry enough to draw the
 * route on a level as well as describe it.
 */
export type IndoorJourneyStep =
  | Readonly<{
      kind: "approach";
      buildingName: string;
      entranceNodeId: string;
      levelId: string;
      at: IndoorPoint;
      accessibility: IndoorAccessibility;
    }>
  | Readonly<{
      kind: "connector";
      connectorId: string;
      connectorKind: IndoorConnectorKind;
      connectorName: string;
      fromLevelId: string;
      toLevelId: string;
      /** The vertical leg, which is not part of either floor's walk. */
      distanceMetres: number;
      accessibility: IndoorAccessibility;
    }>
  | Readonly<{
      kind: "level";
      levelId: string;
      levelName: string;
      levelRef: string;
      polyline: readonly IndoorPoint[];
      edgeIds: readonly string[];
      distanceMetres: number;
      arrives: boolean;
    }>;

export type IndoorJourney = Readonly<{
  steps: readonly IndoorJourneyStep[];
  route: CampusIndoorRoute;
  distanceMetres: number;
  entranceNodeId: string;
}>;

export type IndoorJourneyInput = Readonly<{
  document: CampusIndoorDocument;
  buildingName: string;
  targetSpaceId: string;
  /** Which way in to use. The nearest entrance is chosen when this is omitted. */
  entranceNodeId?: string;
  accessibleOnly?: boolean;
}>;

/** Every way into the building, in a stable order. */
export function listIndoorEntrances(document: CampusIndoorDocument) {
  return document.routeNodes
    .filter((node) => node.kind === "entrance")
    .toSorted((left, right) => left.id.localeCompare(right.id, "en-AU"));
}

export function buildIndoorJourney({
  document,
  buildingName,
  targetSpaceId,
  entranceNodeId,
  accessibleOnly = false,
}: IndoorJourneyInput): IndoorJourney | null {
  const entrances = listIndoorEntrances(document);
  const candidates = entranceNodeId
    ? entrances.filter((node) => node.id === entranceNodeId)
    : entrances;
  if (candidates.length === 0) return null;

  // With several ways in, take whichever actually gives the shortest walk.
  let best: { route: CampusIndoorRoute; entranceNodeId: string } | null = null;
  for (const entrance of candidates) {
    const route = findIndoorRouteFromNode(
      document,
      entrance.id,
      targetSpaceId,
      {
        accessibleOnly,
      },
    );
    if (!route) continue;
    if (best && best.route.distanceMetres <= route.distanceMetres) continue;
    best = { route, entranceNodeId: entrance.id };
  }
  if (!best) return null;

  const nodes = new Map(document.routeNodes.map((node) => [node.id, node]));
  const edges = new Map(document.routeEdges.map((edge) => [edge.id, edge]));
  const levels = new Map(document.levels.map((level) => [level.id, level]));
  const connectors = new Map(
    document.connectors.map((connector) => [connector.id, connector]),
  );

  const entranceNode = nodes.get(best.entranceNodeId)!;
  const steps: IndoorJourneyStep[] = [
    {
      kind: "approach",
      buildingName,
      entranceNodeId: entranceNode.id,
      levelId: entranceNode.levelId,
      at: entranceNode.position,
      accessibility: entranceNode.accessibility ?? "unknown",
    },
  ];

  // Walk the route, gathering consecutive nodes on one floor into a level step
  // and emitting a connector step wherever the floor changes.
  let current: {
    levelId: string;
    polyline: IndoorPoint[];
    edgeIds: string[];
    distanceMetres: number;
  } | null = null;

  function flush(arrives: boolean) {
    if (!current) return;
    const level = levels.get(current.levelId);
    steps.push({
      kind: "level",
      levelId: current.levelId,
      levelName: level?.name ?? "Floor",
      levelRef: level?.ref ?? "",
      polyline: current.polyline,
      edgeIds: current.edgeIds,
      distanceMetres: Number(current.distanceMetres.toFixed(2)),
      arrives,
    });
    current = null;
  }

  best.route.nodeIds.forEach((nodeId, index) => {
    const node = nodes.get(nodeId);
    if (!node) return;

    if (!current || current.levelId !== node.levelId) {
      const previousLevelId = current?.levelId;
      flush(false);

      if (previousLevelId) {
        const edge = edges.get(best!.route.edgeIds[index - 1] ?? "");
        const previousNode = nodes.get(best!.route.nodeIds[index - 1] ?? "");
        const connector = previousNode?.connectorId
          ? connectors.get(previousNode.connectorId)
          : undefined;
        if (connector) {
          steps.push({
            kind: "connector",
            connectorId: connector.id,
            connectorKind: connector.kind,
            connectorName: connector.name,
            fromLevelId: previousLevelId,
            toLevelId: node.levelId,
            distanceMetres: edge?.distanceMetres ?? 0,
            accessibility: edge?.accessibility ?? connector.accessibility,
          });
        }
      }
      current = {
        levelId: node.levelId,
        polyline: [node.position],
        edgeIds: [],
        distanceMetres: 0,
      };
      return;
    }

    current.polyline.push(node.position);
    const edgeId = best!.route.edgeIds[index - 1];
    const edge = edgeId ? edges.get(edgeId) : undefined;
    if (edge) {
      current.edgeIds.push(edge.id);
      current.distanceMetres += edge.distanceMetres;
    }
  });
  flush(true);

  return {
    steps,
    route: best.route,
    distanceMetres: best.route.distanceMetres,
    entranceNodeId: best.entranceNodeId,
  };
}
