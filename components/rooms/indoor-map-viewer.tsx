"use client";

import { useId, useMemo, useState } from "react";
import { Accessibility, ArrowRight, Footprints, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  findIndoorRoute,
  listIndoorRoomDetails,
  type CampusIndoorDocument,
  type CampusIndoorRoute,
  type CampusIndoorSpace,
  type IndoorSpaceGeometry,
} from "@/lib/rooms/indoor-map";

function polygonPoints(points: readonly { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function SpaceShape({
  geometry,
  className,
}: {
  geometry: IndoorSpaceGeometry;
  className?: string;
}) {
  if (geometry.type === "rectangle") {
    return (
      <rect
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        rx={geometry.cornerRadius}
        className={className}
      />
    );
  }
  if (geometry.type === "ellipse") {
    return (
      <ellipse
        cx={geometry.cx}
        cy={geometry.cy}
        rx={geometry.rx}
        ry={geometry.ry}
        className={className}
      />
    );
  }
  return (
    <polygon points={polygonPoints(geometry.points)} className={className} />
  );
}

function spaceCentre(space: CampusIndoorSpace) {
  const geometry = space.geometry;
  if (geometry.type === "rectangle") {
    return {
      x: geometry.x + geometry.width / 2,
      y: geometry.y + geometry.height / 2,
    };
  }
  if (geometry.type === "ellipse") {
    return { x: geometry.cx, y: geometry.cy };
  }
  const total = geometry.points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  return {
    x: total.x / geometry.points.length,
    y: total.y / geometry.points.length,
  };
}

function formatIndoorDistance(distanceMetres: number) {
  if (distanceMetres < 1) return "<1 m";
  return `${Math.round(distanceMetres)} m`;
}

function formatRouteSummary(
  document: CampusIndoorDocument,
  route: CampusIndoorRoute,
) {
  const levels = new Map(document.levels.map((level) => [level.id, level]));
  const routeLevels = route.levelIds
    .map((levelId) => levels.get(levelId))
    .filter((level) => level !== undefined);
  const edges = new Map(document.routeEdges.map((edge) => [edge.id, edge]));
  const connectorKinds = [
    ...new Set(
      route.edgeIds
        .map((edgeId) => edges.get(edgeId)?.kind)
        .filter((kind) => kind !== undefined && kind !== "walking"),
    ),
  ];
  const levelSummary =
    routeLevels.length > 1
      ? routeLevels.map((level) => level.ref || level.name).join(" → ")
      : (routeLevels[0]?.name ?? "Same floor");
  const connectorSummary =
    connectorKinds.length > 0 ? ` · via ${connectorKinds.join(" + ")}` : "";

  return `${levelSummary} · ${formatIndoorDistance(route.distanceMetres)}${connectorSummary}`;
}

function routeSegmentsForLevel(
  document: CampusIndoorDocument,
  route: CampusIndoorRoute,
  levelId: string,
) {
  const nodes = new Map(document.routeNodes.map((node) => [node.id, node]));
  const edges = new Map(document.routeEdges.map((edge) => [edge.id, edge]));

  return route.edgeIds.flatMap((edgeId) => {
    const edge = edges.get(edgeId);
    if (!edge || edge.kind !== "walking") return [];
    const from = nodes.get(edge.fromNodeId);
    const to = nodes.get(edge.toNodeId);
    if (!from || !to || from.levelId !== levelId || to.levelId !== levelId) {
      return [];
    }
    return [{ id: edge.id, from: from.position, to: to.position }];
  });
}

type IndoorMapViewerProps = Readonly<{
  buildingName: string;
  document: CampusIndoorDocument;
  query?: string;
}>;

export function IndoorMapViewer(props: IndoorMapViewerProps) {
  const documentKey = `${props.buildingName}:${props.document.levels
    .map((level) => level.id)
    .join(",")}:${props.document.spaces.map((space) => space.id).join(",")}`;

  return <IndoorMapViewerContent key={documentKey} {...props} />;
}

function IndoorMapViewerContent({
  buildingName,
  document,
  query = "",
}: IndoorMapViewerProps) {
  const queryTerm = query.trim().toLocaleLowerCase("en-AU");
  const initialMatch = queryTerm
    ? document.spaces.find(
        (space) =>
          space.kind === "room" &&
          space.searchable &&
          `${space.ref} ${space.name}`
            .toLocaleLowerCase("en-AU")
            .includes(queryTerm),
      )
    : undefined;
  const initialLevelId = initialMatch?.levelId ?? document.levels[0]?.id ?? "";
  const initialSpaceId = initialMatch?.id ?? "";
  const accessibleOnlyId = useId();
  const [levelId, setLevelId] = useState(initialLevelId);
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialSpaceId);
  const [fromSpaceId, setFromSpaceId] = useState("");
  const [toSpaceId, setToSpaceId] = useState(initialSpaceId);
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  const selectedLevel =
    document.levels.find((level) => level.id === levelId) ?? document.levels[0];
  const spaces = useMemo(
    () =>
      document.spaces.filter((space) => space.levelId === selectedLevel?.id),
    [document.spaces, selectedLevel?.id],
  );
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);
  const routeRooms = useMemo(() => listIndoorRoomDetails(document), [document]);
  const roomOptions = useMemo(
    () =>
      routeRooms.map((room) => ({
        value: room.spaceId,
        label: `${
          room.ref && room.name ? `${room.ref} · ${room.name}` : room.label
        } · ${room.levelRef || room.levelName}`,
      })),
    [routeRooms],
  );
  const route = useMemo(
    () =>
      fromSpaceId && toSpaceId && fromSpaceId !== toSpaceId
        ? findIndoorRoute(document, fromSpaceId, toSpaceId, {
            accessibleOnly,
          })
        : null,
    [accessibleOnly, document, fromSpaceId, toSpaceId],
  );
  const activeRouteSegments = useMemo(
    () =>
      route && selectedLevel
        ? routeSegmentsForLevel(document, route, selectedLevel.id)
        : [],
    [document, route, selectedLevel],
  );
  const activeRouteEndpoints = useMemo(() => {
    if (!route || !selectedLevel) return [];
    const nodes = new Map(document.routeNodes.map((node) => [node.id, node]));
    return [route.nodeIds[0], route.nodeIds.at(-1)].flatMap((nodeId) => {
      const node = nodeId ? nodes.get(nodeId) : undefined;
      return node?.levelId === selectedLevel.id ? [node] : [];
    });
  }, [document.routeNodes, route, selectedLevel]);
  const routeSummary = route ? formatRouteSummary(document, route) : null;

  function changeRouteEndpoint(kind: "from" | "to", spaceId: string) {
    if (kind === "from") setFromSpaceId(spaceId);
    else setToSpaceId(spaceId);

    const room = routeRooms.find((candidate) => candidate.spaceId === spaceId);
    if (!room) return;
    setLevelId(room.levelId);
    setSelectedSpaceId(room.spaceId);
  }

  if (!selectedLevel) {
    return (
      <div className="p-5 text-sm text-zinc-600">
        This building does not have any published floors yet.
      </div>
    );
  }

  return (
    <section aria-label={`${buildingName} floor plan`} className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">
            {buildingName}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Select a room or change floors.
          </p>
        </div>
        <div className="flex flex-wrap gap-1" aria-label="Building levels">
          {document.levels.map((level) => (
            <Button
              key={level.id}
              size="sm"
              variant={level.id === selectedLevel.id ? "subtle" : "ghost"}
              aria-pressed={level.id === selectedLevel.id}
              onClick={() => {
                setLevelId(level.id);
                setSelectedSpaceId("");
              }}
            >
              {level.ref}
            </Button>
          ))}
        </div>
      </header>

      {routeRooms.length > 1 ? (
        <section
          aria-label="Indoor route preview"
          className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
            <Select
              aria-label="Schematic route start room"
              className="min-h-11"
              onChange={(spaceId) => changeRouteEndpoint("from", spaceId)}
              options={roomOptions}
              placeholder="From room"
              value={fromSpaceId}
            />
            <ArrowRight
              aria-hidden="true"
              className="shrink-0 text-zinc-400"
              size={15}
            />
            <Select
              aria-label="Schematic route destination room"
              className="min-h-11"
              onChange={(spaceId) => changeRouteEndpoint("to", spaceId)}
              options={roomOptions}
              placeholder="To room"
              value={toSpaceId}
            />
            <label
              className="col-span-3 flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 sm:col-span-1"
              htmlFor={accessibleOnlyId}
            >
              <Checkbox
                checked={accessibleOnly}
                id={accessibleOnlyId}
                onCheckedChange={(checked) =>
                  setAccessibleOnly(checked === true)
                }
              />
              Accessible only
            </label>
          </div>
          <div
            aria-live="polite"
            className="min-h-5 text-xs leading-5"
            role="status"
          >
            {fromSpaceId && toSpaceId && fromSpaceId === toSpaceId ? (
              <p className="text-amber-700">Choose two different rooms.</p>
            ) : routeSummary ? (
              <p className="font-medium text-zinc-700">
                Schematic route: {routeSummary}
              </p>
            ) : fromSpaceId && toSpaceId ? (
              <p className="text-rose-700">
                {accessibleOnly
                  ? "No verified accessible route is available."
                  : "No schematic route is available."}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="grid min-h-0 md:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="min-h-72 overflow-hidden bg-zinc-50 p-3">
          <svg
            role="img"
            aria-label={`${selectedLevel.name} floor plan${route ? " with a schematic route" : ""}`}
            viewBox={`0 0 ${document.viewBox.width} ${document.viewBox.height}`}
            className="h-full min-h-64 w-full rounded-md border border-zinc-200 bg-white"
          >
            <polygon
              points={polygonPoints(selectedLevel.outline)}
              className="fill-zinc-100 stroke-zinc-400 [stroke-width:4]"
            />
            {spaces.map((space) => {
              const selected = space.id === selectedSpaceId;
              const routeEndpoint =
                space.id === fromSpaceId || space.id === toSpaceId;
              return (
                <g
                  key={space.id}
                  role="button"
                  tabIndex={0}
                  aria-label={space.name || space.ref || space.kind}
                  className="cursor-pointer outline-none"
                  onClick={() => setSelectedSpaceId(space.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedSpaceId(space.id);
                    }
                  }}
                >
                  <SpaceShape
                    geometry={space.geometry}
                    className={cn(
                      "stroke-[3] transition-colors",
                      selected
                        ? "fill-brand-100 stroke-brand-700"
                        : routeEndpoint
                          ? "fill-brand-50 stroke-brand-500"
                          : space.kind === "corridor"
                            ? "fill-zinc-200 stroke-zinc-400"
                            : "fill-white stroke-zinc-500",
                    )}
                  />
                </g>
              );
            })}
            {activeRouteSegments.length > 0 ? (
              <g aria-hidden="true" className="pointer-events-none">
                {activeRouteSegments.map((segment) => (
                  <g key={segment.id}>
                    <line
                      className="stroke-white [stroke-width:20] [stroke-linecap:round]"
                      x1={segment.from.x}
                      x2={segment.to.x}
                      y1={segment.from.y}
                      y2={segment.to.y}
                    />
                    <line
                      className="stroke-brand-600 [stroke-width:10] [stroke-dasharray:24_14] [stroke-linecap:round]"
                      x1={segment.from.x}
                      x2={segment.to.x}
                      y1={segment.from.y}
                      y2={segment.to.y}
                    />
                  </g>
                ))}
              </g>
            ) : null}
            {activeRouteEndpoints.map((node) => (
              <g
                aria-hidden="true"
                className="pointer-events-none"
                key={node.id}
              >
                <circle
                  className="fill-none stroke-white [stroke-width:18]"
                  cx={node.position.x}
                  cy={node.position.y}
                  r="19"
                />
                <circle
                  className="fill-none stroke-brand-700 [stroke-width:8]"
                  cx={node.position.x}
                  cy={node.position.y}
                  r="19"
                />
              </g>
            ))}
            {spaces
              .filter((space) => space.kind === "room")
              .map((space) => {
                const centre = spaceCentre(space);
                return (
                  <text
                    className="pointer-events-none fill-zinc-800 text-[24px] font-semibold"
                    dominantBaseline="middle"
                    key={`label-${space.id}`}
                    textAnchor="middle"
                    x={centre.x}
                    y={centre.y}
                  >
                    {space.ref || space.name}
                  </text>
                );
              })}
            {document.connectors
              .filter((connector) =>
                connector.levelIds.includes(selectedLevel.id),
              )
              .map((connector) => (
                <g key={connector.id}>
                  <circle
                    cx={connector.position.x}
                    cy={connector.position.y}
                    r="25"
                    className="fill-brand-600 stroke-white [stroke-width:4]"
                  />
                  <text
                    x={connector.position.x}
                    y={connector.position.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none fill-white text-[18px] font-bold uppercase"
                  >
                    {connector.kind === "lift" ? "L" : "S"}
                  </text>
                </g>
              ))}
          </svg>
        </div>

        <aside className="border-t border-zinc-200 p-4 md:border-t-0 md:border-l">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
            <Layers3 aria-hidden="true" size={14} />
            {selectedLevel.name}
          </p>
          {selectedSpace ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-zinc-950">
                {selectedSpace.name || selectedSpace.ref}
              </p>
              {selectedSpace.ref ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Room {selectedSpace.ref}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Select a room on the plan for its details.
            </p>
          )}
          <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
            <p className="flex items-center gap-2">
              <Footprints aria-hidden="true" size={14} />
              {spaces.filter((space) => space.kind === "room").length} rooms
            </p>
            {document.connectors.some(
              (connector) =>
                connector.kind === "lift" &&
                connector.levelIds.includes(selectedLevel.id),
            ) ? (
              <p className="flex items-center gap-2">
                <Accessibility aria-hidden="true" size={14} />
                Lift shown, accessibility unverified
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
