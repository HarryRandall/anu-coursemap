"use client";

import { useCallback, useMemo, useRef, useState, type Dispatch } from "react";
import type { IndoorTool } from "@/components/admin/rooms/tool-palette";
import {
  indoorGeometryBounds,
  indoorGeometryRing,
  pointInIndoorGeometry,
  resizeIndoorGeometryToBounds,
  thickenPolyline,
  translateIndoorGeometry,
} from "@/lib/rooms/indoor-geometry";
import {
  isIndoorPointWithinFootprint,
  isIndoorRingWithinFootprint,
  isIndoorSegmentWithinFootprint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";
import {
  appendDrawPoint,
  dragDelta,
  drawnPoints,
  drawnRectangleBounds,
  dropLastDrawPoint,
  handlePoint,
  IDLE_DRAG,
  previewDrawPoint,
  resizeBounds,
  type IndoorDrag,
  type IndoorHandleId,
} from "@/lib/rooms/indoor-drag";
import { gridStepsForScale } from "@/lib/rooms/indoor-grid";
import {
  collectSnapTargets,
  snapPoint,
  type IndoorSnapResult,
} from "@/lib/rooms/indoor-snap";
import {
  closestPointOnWall,
  openingSides,
  wallSegmentLength,
} from "@/lib/rooms/indoor-walls";
import type {
  IndoorEditorAction,
  IndoorSelection,
} from "@/lib/rooms/indoor-editor-state";
import type {
  CampusIndoorDocument,
  CampusIndoorLevel,
  IndoorPoint,
} from "@/lib/rooms/indoor-map";

/**
 * The parts of a pointer or keyboard event this hook uses. Typing it
 * structurally lets the same handlers serve a React synthetic event and a
 * native one, which matters because the editing surface is a map.
 */
type PointerLike = Readonly<{ button?: number; shiftKey: boolean }>;
type KeyLike = Readonly<{ key: string; preventDefault: () => void }>;

/** Snap radius in CSS pixels, converted to local units at the current zoom. */
const SNAP_TOLERANCE_PIXELS = 10;
const DEFAULT_WALL_THICKNESS = 2;
const DEFAULT_DOOR_WIDTH = 9;
const CONNECTOR_HALF_SIZE_UNITS = 12;
const BOUNDARY_MESSAGE = "Keep rooms and paths inside the building outline.";

function connectorRing(point: IndoorPoint) {
  return [
    {
      x: point.x - CONNECTOR_HALF_SIZE_UNITS,
      y: point.y - CONNECTOR_HALF_SIZE_UNITS,
    },
    {
      x: point.x + CONNECTOR_HALF_SIZE_UNITS,
      y: point.y - CONNECTOR_HALF_SIZE_UNITS,
    },
    {
      x: point.x + CONNECTOR_HALF_SIZE_UNITS,
      y: point.y + CONNECTOR_HALF_SIZE_UNITS,
    },
    {
      x: point.x - CONNECTOR_HALF_SIZE_UNITS,
      y: point.y + CONNECTOR_HALF_SIZE_UNITS,
    },
  ];
}

function wallPointsFitFootprint(
  points: readonly IndoorPoint[],
  closed: boolean,
  thickness: number,
  projection: IndoorFootprintProjection,
) {
  const segmentCount = closed ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    if (!isIndoorSegmentWithinFootprint(start, end, projection)) return false;
    if (
      !isIndoorRingWithinFootprint(
        thickenPolyline([start, end], Math.max(thickness, 1), false),
        projection,
      )
    ) {
      return false;
    }
  }
  return true;
}

function pathFitsFootprint(
  points: readonly IndoorPoint[],
  projection: IndoorFootprintProjection,
) {
  return points
    .slice(1)
    .every((point, index) =>
      isIndoorSegmentWithinFootprint(points[index], point, projection),
    );
}

function editorId(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

/**
 * Turns pointer and keyboard input on the canvas into document actions. The
 * geometry, snapping and gesture rules all live in pure modules; this only
 * decides which of them applies.
 */
export function useEditorPointer({
  document,
  routedDocument,
  footprint,
  level,
  tool,
  selection,
  editingEnabled = true,
  dispatch,
  onToolDone,
}: {
  document: CampusIndoorDocument;
  routedDocument: CampusIndoorDocument;
  footprint: IndoorFootprintProjection | null;
  level: CampusIndoorLevel | undefined;
  tool: IndoorTool;
  selection: IndoorSelection;
  /** Pitched 3D unprojects onto the ground plane, so geometry edits are plan-only. */
  editingEnabled?: boolean;
  dispatch: Dispatch<IndoorEditorAction>;
  onToolDone: () => void;
}) {
  const [drag, setDragState] = useState<IndoorDrag>(IDLE_DRAG);
  const dragRef = useRef<IndoorDrag>(IDLE_DRAG);
  const setDrag = useCallback(
    (next: IndoorDrag | ((current: IndoorDrag) => IndoorDrag)) => {
      const resolved =
        typeof next === "function" ? next(dragRef.current) : next;
      dragRef.current = resolved;
      setDragState(resolved);
    },
    [],
  );
  const [snap, setSnap] = useState<IndoorSnapResult | null>(null);
  const [boundaryMessage, setBoundaryMessage] = useState<string | null>(null);
  const scaleRef = useRef(1);
  const shiftRef = useRef(false);
  // A drag ends with a click. Without this the click would immediately clear
  // the selection the drag was just applied to.
  const gestureRef = useRef(false);

  const levelId = level?.id ?? "";
  const targets = useMemo(
    () =>
      collectSnapTargets(document, levelId, {
        excludeIds: selection ? new Set([selection.id]) : undefined,
      }),
    [document, levelId, selection],
  );

  const resolve = useCallback(
    (point: IndoorPoint, origin?: IndoorPoint | null) => {
      const scale = scaleRef.current;
      const grid = gridStepsForScale(scale);
      const result = snapPoint(point, targets, SNAP_TOLERANCE_PIXELS / scale, {
        gridStep: grid.minorUnits,
        axisOrigin: origin ?? null,
        axisLock: shiftRef.current,
      });
      setSnap(result);
      return result.point;
    },
    [targets],
  );

  const onViewChange = useCallback((context: { scale: number }) => {
    scaleRef.current = context.scale;
  }, []);

  /** The map reports how many local units one pixel covers. */
  const onUnitsPerPixel = useCallback((unitsPerPixel: number) => {
    scaleRef.current = unitsPerPixel > 0 ? 1 / unitsPerPixel : 1;
  }, []);

  const cancel = useCallback(() => {
    setDrag(IDLE_DRAG);
    setSnap(null);
    setBoundaryMessage(null);
  }, [setDrag]);

  const blockBoundary = useCallback(() => {
    setBoundaryMessage(BOUNDARY_MESSAGE);
  }, []);

  /** Which room lies on either side of an opening, so a door knows what it serves. */
  const resolveOpeningRoom = useCallback(
    (wallId: string, segmentIndex: number, offset: number) => {
      const wall = document.walls.find((candidate) => candidate.id === wallId);
      if (!wall) return { spaceId: undefined, exterior: false };

      const [left, right] = openingSides(wall, { segmentIndex, offset });
      const rooms = document.spaces.filter(
        (space) => space.levelId === wall.levelId && space.kind === "room",
      );
      const leftRoom = rooms.find((space) =>
        pointInIndoorGeometry(space.geometry, left),
      );
      const rightRoom = rooms.find((space) =>
        pointInIndoorGeometry(space.geometry, right),
      );
      const inside = leftRoom ?? rightRoom;

      // Both sides clear of every room on a closed perimeter reads as a way out.
      const exterior = !leftRoom && !rightRoom && wall.closed;
      return { spaceId: inside?.id, exterior };
    },
    [document.spaces, document.walls],
  );

  const finishDraw = useCallback(
    (current: IndoorDrag) => {
      if (!level || !footprint) return;
      const points = drawnPoints(current);
      if (!points || current.kind !== "draw-points") {
        cancel();
        return;
      }

      if (current.tool === "wall") {
        if (
          !wallPointsFitFootprint(
            points,
            false,
            DEFAULT_WALL_THICKNESS,
            footprint,
          )
        ) {
          blockBoundary();
          return;
        }
        dispatch({
          type: "wall/add",
          wall: {
            id: editorId("wall"),
            levelId: level.id,
            kind: "structural",
            points: points.map((point) => ({ ...point })),
            thickness: DEFAULT_WALL_THICKNESS,
            closed: false,
            openings: [],
          },
        });
      } else if (current.tool === "polygon") {
        if (!isIndoorRingWithinFootprint(points, footprint)) {
          blockBoundary();
          return;
        }
        dispatch({
          type: "space/add",
          space: {
            id: editorId("space"),
            levelId: level.id,
            kind: "room",
            ref: "",
            name: "",
            searchable: true,
            geometry: {
              type: "polygon",
              points: points.map((p) => ({ ...p })),
            },
          },
        });
      } else {
        if (!pathFitsFootprint(points, footprint)) {
          blockBoundary();
          return;
        }
        // A walking path becomes junction nodes joined end to end, snapped onto
        // any door or connector it starts or finishes on.
        const nodes = points.map((point) => {
          const existing = routedDocument.routeNodes.find(
            (node) =>
              node.levelId === level.id &&
              Math.hypot(node.position.x - point.x, node.position.y - point.y) <
                1,
          );
          return (
            existing ?? {
              id: editorId("junction"),
              levelId: level.id,
              kind: "junction" as const,
              position: point,
            }
          );
        });
        const added = nodes.filter(
          (node) =>
            !routedDocument.routeNodes.some(
              (existing) => existing.id === node.id,
            ),
        );
        const edges = nodes.slice(1).map((node, index) => ({
          id: editorId("path"),
          fromNodeId: nodes[index].id,
          toNodeId: node.id,
          kind: "walking" as const,
          bidirectional: true,
          distanceMetres: Math.max(
            0.01,
            Math.hypot(
              node.position.x - nodes[index].position.x,
              node.position.y - nodes[index].position.y,
            ) / 10,
          ),
          accessibility: "unknown" as const,
        }));
        dispatch({
          type: "document/replace",
          document: {
            ...document,
            routeNodes: [...document.routeNodes, ...added],
            routeEdges: [...document.routeEdges, ...edges],
          },
        });
      }
      setBoundaryMessage(null);
      cancel();
      onToolDone();
    },
    [
      blockBoundary,
      cancel,
      dispatch,
      document,
      footprint,
      level,
      onToolDone,
      routedDocument.routeNodes,
    ],
  );

  const onPointerDown = useCallback(
    (rawPoint: IndoorPoint, event: PointerLike) => {
      if (!editingEnabled || !footprint || !level || event.button !== 0) return;
      shiftRef.current = event.shiftKey;
      const point = resolve(rawPoint);

      if (tool === "rectangle" || tool === "corridor") {
        if (!isIndoorPointWithinFootprint(point, footprint)) {
          blockBoundary();
          return;
        }
        setBoundaryMessage(null);
        setDrag({
          kind: "draw-rect",
          tool,
          origin: point,
          current: point,
        });
        return;
      }
      if (tool === "wall" || tool === "polygon" || tool === "path") {
        const current = dragRef.current;
        const previous =
          current.kind === "draw-points" ? current.points.at(-1) : undefined;
        if (
          !isIndoorPointWithinFootprint(point, footprint) ||
          (previous &&
            !isIndoorSegmentWithinFootprint(previous, point, footprint))
        ) {
          blockBoundary();
          return;
        }
        setBoundaryMessage(null);
        setDrag((current) =>
          appendDrawPoint(
            current,
            tool === "polygon" ? "polygon" : tool === "wall" ? "wall" : "path",
            point,
          ),
        );
        return;
      }
      if (tool === "stairs" || tool === "lift") {
        if (!isIndoorRingWithinFootprint(connectorRing(point), footprint)) {
          blockBoundary();
          return;
        }
        setBoundaryMessage(null);
        dispatch({
          type: "connector/add",
          connector: {
            id: editorId(tool),
            kind: tool,
            name: tool === "lift" ? "Lift" : "Stairs",
            levelIds: document.levels.map((candidate) => candidate.id),
            position: point,
            accessibility: tool === "lift" ? "unknown" : "inaccessible",
          },
        });
        onToolDone();
        return;
      }
      if (tool === "opening") {
        let best: {
          wallId: string;
          segmentIndex: number;
          offset: number;
          distance: number;
        } | null = null;
        for (const wall of document.walls) {
          if (wall.levelId !== level.id) continue;
          const projection = closestPointOnWall(wall, rawPoint);
          if (!projection) continue;
          if (best && best.distance <= projection.distance) continue;
          best = {
            wallId: wall.id,
            segmentIndex: projection.segmentIndex,
            offset: projection.offset,
            distance: projection.distance,
          };
        }
        if (
          !best ||
          best.distance > (SNAP_TOLERANCE_PIXELS * 3) / scaleRef.current
        ) {
          return;
        }

        const wall = document.walls.find(
          (candidate) => candidate.id === best.wallId,
        )!;
        const segment = wallSegmentLength(wall, best.segmentIndex);
        const width = Math.min(DEFAULT_DOOR_WIDTH, segment);
        const half = width / 2 / segment;
        const offset = Math.min(1 - half, Math.max(half, best.offset));
        const { spaceId, exterior } = resolveOpeningRoom(
          best.wallId,
          best.segmentIndex,
          offset,
        );
        dispatch({
          type: "opening/add",
          wallId: best.wallId,
          opening: {
            id: editorId("opening"),
            kind: "door",
            segmentIndex: best.segmentIndex,
            offset,
            width,
            accessibility: "accessible",
            ...(exterior ? { exterior: true } : {}),
            ...(spaceId ? { spaceId } : {}),
          },
        });
        onToolDone();
        return;
      }

      // Select tool: begin a move when the press lands on the selection.
      if (!selection) return;
      const space = document.spaces.find(
        (candidate) => candidate.id === selection.id,
      );
      if (space && pointInIndoorGeometry(space.geometry, rawPoint)) {
        setDrag({
          kind: "move",
          targetId: selection.id,
          origin: rawPoint,
          current: rawPoint,
        });
      }
    },
    [
      blockBoundary,
      dispatch,
      document.levels,
      document.spaces,
      document.walls,
      editingEnabled,
      footprint,
      level,
      onToolDone,
      resolve,
      resolveOpeningRoom,
      selection,
      setDrag,
      tool,
    ],
  );

  const onPointerMove = useCallback(
    (rawPoint: IndoorPoint, event: PointerLike) => {
      shiftRef.current = event.shiftKey;
      setDrag((current) => {
        if (current.kind === "idle") return current;
        if (current.kind === "draw-points") {
          return previewDrawPoint(
            current,
            resolve(rawPoint, current.points.at(-1)),
          );
        }
        if (current.kind === "draw-rect") {
          return { ...current, current: resolve(rawPoint, current.origin) };
        }
        if (current.kind === "move") {
          return { ...current, current: rawPoint };
        }
        if (current.kind === "resize") {
          return {
            ...current,
            current: resolve(rawPoint),
            keepAspect: event.shiftKey,
          };
        }
        if (current.kind === "vertex") {
          return { ...current, point: resolve(rawPoint) };
        }
        return current;
      });
    },
    [resolve, setDrag],
  );

  const onPointerUp = useCallback(() => {
    const current = dragRef.current;
    if (current.kind !== "idle" && current.kind !== "draw-points") {
      gestureRef.current = true;
    }
    if (!footprint) {
      setDrag(IDLE_DRAG);
      return;
    }

    if (current.kind === "move") {
      const delta = dragDelta(current);
      const space = document.spaces.find(
        (candidate) => candidate.id === current.targetId,
      );
      if (space && (delta.x !== 0 || delta.y !== 0)) {
        const moved = translateIndoorGeometry(space.geometry, delta);
        if (
          !isIndoorRingWithinFootprint(indoorGeometryRing(moved), footprint)
        ) {
          blockBoundary();
          setDrag(IDLE_DRAG);
          return;
        }
        dispatch({ type: "space/translate", id: current.targetId, delta });
        setBoundaryMessage(null);
      }
      setDrag(IDLE_DRAG);
      return;
    }

    if (current.kind === "resize") {
      const bounds = resizeBounds(
        current.start,
        current.handle,
        current.current,
        current.keepAspect,
      );
      const space = document.spaces.find(
        (candidate) => candidate.id === current.targetId,
      );
      if (space) {
        const resized = resizeIndoorGeometryToBounds(space.geometry, bounds);
        if (
          !isIndoorRingWithinFootprint(indoorGeometryRing(resized), footprint)
        ) {
          blockBoundary();
          setDrag(IDLE_DRAG);
          return;
        }
        dispatch({ type: "space/resize", id: current.targetId, bounds });
        setBoundaryMessage(null);
      }
      setDrag(IDLE_DRAG);
      return;
    }

    if (current.kind === "vertex") {
      const wall = document.walls.find(
        (candidate) => candidate.id === current.targetId,
      );
      if (wall) {
        const points = wall.points.map((point, index) =>
          index === current.index ? current.point : point,
        );
        if (
          !wallPointsFitFootprint(
            points,
            wall.closed,
            wall.thickness,
            footprint,
          )
        ) {
          blockBoundary();
          setDrag(IDLE_DRAG);
          return;
        }
        dispatch({
          type: "wall/vertex/move",
          id: current.targetId,
          index: current.index,
          point: current.point,
        });
        setBoundaryMessage(null);
      }
      setDrag(IDLE_DRAG);
      return;
    }

    if (current.kind === "draw-rect") {
      const bounds = drawnRectangleBounds(current);
      if (bounds && level) {
        const geometry = {
          type: "rectangle" as const,
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
          cornerRadius: 0,
        };
        if (
          !isIndoorRingWithinFootprint(indoorGeometryRing(geometry), footprint)
        ) {
          blockBoundary();
          setDrag(IDLE_DRAG);
          return;
        }
        dispatch({
          type: "space/add",
          space: {
            id: editorId("space"),
            levelId: level.id,
            kind: current.tool === "corridor" ? "corridor" : "room",
            ref: "",
            name: "",
            searchable: current.tool !== "corridor",
            geometry,
          },
        });
        setBoundaryMessage(null);
        onToolDone();
      }
      setDrag(IDLE_DRAG);
    }
  }, [
    blockBoundary,
    dispatch,
    document.spaces,
    document.walls,
    footprint,
    level,
    onToolDone,
    setDrag,
  ]);

  const onHandlePointerDown = useCallback(
    (handle: IndoorHandleId | number, targetId: string) => {
      if (!editingEnabled) return;
      if (typeof handle === "number") {
        const wall = document.walls.find(
          (candidate) => candidate.id === targetId,
        );
        if (!wall) return;
        setDrag({
          kind: "vertex",
          targetId,
          index: handle,
          point: wall.points[handle],
        });
        return;
      }
      const space = document.spaces.find(
        (candidate) => candidate.id === targetId,
      );
      if (!space) return;
      const start = indoorGeometryBounds(space.geometry);
      setDrag({
        kind: "resize",
        targetId,
        handle,
        start,
        // Start from where the handle already is, so a press with no drag
        // leaves the room exactly as it was rather than collapsing it.
        current: handlePoint(start, handle),
        keepAspect: false,
      });
    },
    [document.spaces, document.walls, editingEnabled, setDrag],
  );

  const onKeyDown = useCallback(
    (event: KeyLike) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        onToolDone();
        return;
      }
      if (!editingEnabled) return;
      if (event.key === "Enter") {
        event.preventDefault();
        finishDraw(dragRef.current);
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        if (dragRef.current.kind === "draw-points") {
          setDrag(dropLastDrawPoint(dragRef.current));
          return;
        }
        if (selection) dispatch({ type: "delete" });
      }
    },
    [
      cancel,
      dispatch,
      editingEnabled,
      finishDraw,
      onToolDone,
      selection,
      setDrag,
    ],
  );

  /** Double-click finishes a multi-point drawing, as Enter does. */
  const onDoubleClick = useCallback(() => {
    if (dragRef.current.kind === "draw-points") finishDraw(dragRef.current);
  }, [finishDraw]);

  const onSelect = useCallback(
    (canvasSelection: IndoorSelection) => {
      if (tool !== "select") return;
      if (gestureRef.current) {
        gestureRef.current = false;
        return;
      }
      dispatch({
        type: "select",
        selection: canvasSelection
          ? { kind: canvasSelection.kind, id: canvasSelection.id }
          : null,
      });
    },
    [dispatch, tool],
  );

  return {
    drag,
    snap,
    boundaryMessage,
    cancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onHandlePointerDown,
    onKeyDown,
    onDoubleClick,
    onSelect,
    /** The canvas reports its camera so pixel tolerances convert correctly. */
    onViewChange,
    onUnitsPerPixel,
  };
}
