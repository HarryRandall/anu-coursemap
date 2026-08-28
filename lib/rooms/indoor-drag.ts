import type { IndoorBounds } from "@/lib/rooms/indoor-geometry";
import type { IndoorPoint } from "@/lib/rooms/indoor-map";

/**
 * Pure transitions for a pointer gesture on the floor plan. Only the editor
 * turns a finished drag into a document action, so everything here can be
 * tested without a DOM.
 *
 * Imported only from the admin editor.
 */

/** The eight resize handles, named by the corner or edge they sit on. */
export type IndoorHandleId =
  | "north-west"
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west";

export const INDOOR_HANDLE_IDS: readonly IndoorHandleId[] = [
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
];

export type IndoorDrawTool = "wall" | "polygon" | "path";
export type IndoorRectangleTool = "rectangle" | "corridor";

export type IndoorDrag =
  | Readonly<{ kind: "idle" }>
  | Readonly<{
      kind: "move";
      targetId: string;
      origin: IndoorPoint;
      current: IndoorPoint;
    }>
  | Readonly<{
      kind: "resize";
      targetId: string;
      handle: IndoorHandleId;
      start: IndoorBounds;
      current: IndoorPoint;
      keepAspect: boolean;
    }>
  | Readonly<{
      kind: "vertex";
      targetId: string;
      index: number;
      point: IndoorPoint;
    }>
  | Readonly<{
      kind: "draw-rect";
      tool: IndoorRectangleTool;
      origin: IndoorPoint;
      current: IndoorPoint;
    }>
  | Readonly<{
      kind: "draw-points";
      tool: IndoorDrawTool;
      points: readonly IndoorPoint[];
      preview: IndoorPoint | null;
    }>;

export const IDLE_DRAG: IndoorDrag = { kind: "idle" };

/** Smallest room or wall run the editor will create, one metre. */
export const MINIMUM_DRAW_SIZE = 10;

/** Where a handle sits on an extent. */
export function handlePoint(
  bounds: IndoorBounds,
  handle: IndoorHandleId,
): IndoorPoint {
  return {
    x: handle.endsWith("west")
      ? bounds.minX
      : handle.endsWith("east")
        ? bounds.maxX
        : (bounds.minX + bounds.maxX) / 2,
    y: handle.startsWith("north")
      ? bounds.minY
      : handle.startsWith("south")
        ? bounds.maxY
        : (bounds.minY + bounds.maxY) / 2,
  };
}

export function dragDelta(drag: IndoorDrag): IndoorPoint {
  if (drag.kind !== "move") return { x: 0, y: 0 };
  return {
    x: drag.current.x - drag.origin.x,
    y: drag.current.y - drag.origin.y,
  };
}

function normaliseBounds(bounds: IndoorBounds): IndoorBounds {
  return {
    minX: Math.min(bounds.minX, bounds.maxX),
    minY: Math.min(bounds.minY, bounds.maxY),
    maxX: Math.max(bounds.minX, bounds.maxX),
    maxY: Math.max(bounds.minY, bounds.maxY),
  };
}

/**
 * Where a resize handle drags the extent to. Edge handles move one side, corner
 * handles move two, and the result is normalised so dragging a side past its
 * opposite flips rather than inverting the shape.
 */
export function resizeBounds(
  start: IndoorBounds,
  handle: IndoorHandleId,
  point: IndoorPoint,
  keepAspect = false,
): IndoorBounds {
  const movesNorth = handle.startsWith("north");
  const movesSouth = handle.startsWith("south");
  const movesWest = handle.endsWith("west");
  const movesEast = handle.endsWith("east");

  let next: IndoorBounds = {
    minX: movesWest ? point.x : start.minX,
    minY: movesNorth ? point.y : start.minY,
    maxX: movesEast ? point.x : start.maxX,
    maxY: movesSouth ? point.y : start.maxY,
  };

  if (keepAspect && (movesNorth || movesSouth) && (movesEast || movesWest)) {
    const startWidth = start.maxX - start.minX;
    const startHeight = start.maxY - start.minY;
    if (startWidth > 0 && startHeight > 0) {
      const width = Math.abs(next.maxX - next.minX);
      const height = Math.abs(next.maxY - next.minY);
      const scale = Math.max(width / startWidth, height / startHeight);
      const lockedWidth = startWidth * scale;
      const lockedHeight = startHeight * scale;
      next = {
        minX: movesWest ? next.maxX - lockedWidth : next.minX,
        maxX: movesEast ? next.minX + lockedWidth : next.maxX,
        minY: movesNorth ? next.maxY - lockedHeight : next.minY,
        maxY: movesSouth ? next.minY + lockedHeight : next.maxY,
      };
    }
  }

  return normaliseBounds(next);
}

/** The extent a press-drag-release rectangle covers, or null if it is too small. */
export function drawnRectangleBounds(drag: IndoorDrag): IndoorBounds | null {
  if (drag.kind !== "draw-rect") return null;
  const bounds = normaliseBounds({
    minX: drag.origin.x,
    minY: drag.origin.y,
    maxX: drag.current.x,
    maxY: drag.current.y,
  });
  if (
    bounds.maxX - bounds.minX < MINIMUM_DRAW_SIZE ||
    bounds.maxY - bounds.minY < MINIMUM_DRAW_SIZE
  ) {
    return null;
  }
  return bounds;
}

/**
 * The points a multi-point draw finished with, or null when there are too few
 * to make anything. Polygons need three, a wall or path needs two.
 */
export function drawnPoints(drag: IndoorDrag): readonly IndoorPoint[] | null {
  if (drag.kind !== "draw-points") return null;
  const minimum = drag.tool === "polygon" ? 3 : 2;
  return drag.points.length >= minimum ? drag.points : null;
}

export function appendDrawPoint(
  drag: IndoorDrag,
  tool: IndoorDrawTool,
  point: IndoorPoint,
): IndoorDrag {
  if (drag.kind !== "draw-points" || drag.tool !== tool) {
    return { kind: "draw-points", tool, points: [point], preview: null };
  }
  const last = drag.points.at(-1);
  // Ignore a repeated click on the point just placed.
  if (last && last.x === point.x && last.y === point.y) return drag;
  return { ...drag, points: [...drag.points, point], preview: null };
}

export function previewDrawPoint(
  drag: IndoorDrag,
  point: IndoorPoint,
): IndoorDrag {
  if (drag.kind !== "draw-points") return drag;
  return { ...drag, preview: point };
}

/** Backspace drops the last point placed, and clears the gesture at zero. */
export function dropLastDrawPoint(drag: IndoorDrag): IndoorDrag {
  if (drag.kind !== "draw-points") return drag;
  const points = drag.points.slice(0, -1);
  return points.length === 0 ? IDLE_DRAG : { ...drag, points };
}
