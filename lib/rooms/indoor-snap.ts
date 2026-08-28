import { closestPointOnIndoorSegment } from "@/lib/rooms/indoor-geometry";
import { snapToGrid } from "@/lib/rooms/indoor-grid";
import { wallSegments } from "@/lib/rooms/indoor-walls";
import type { CampusIndoorDocument, IndoorPoint } from "@/lib/rooms/indoor-map";

/**
 * Snapping for the floor plan editor. Nothing here touches the DOM: tolerance
 * arrives already converted from pixels to local units by the caller, so
 * snapping behaves identically at every zoom and stays testable.
 *
 * Imported only from the admin editor, so the public viewer never ships it.
 */

export type IndoorSnapKind =
  "vertex" | "corner" | "node" | "edge" | "grid" | "free";

export type IndoorSnapPointTarget = Readonly<{
  kind: Extract<IndoorSnapKind, "vertex" | "corner" | "node">;
  point: IndoorPoint;
  id: string;
}>;

export type IndoorSnapSegmentTarget = Readonly<{
  id: string;
  start: IndoorPoint;
  end: IndoorPoint;
}>;

export type IndoorSnapTargets = Readonly<{
  points: readonly IndoorSnapPointTarget[];
  segments: readonly IndoorSnapSegmentTarget[];
}>;

export type IndoorSnapResult = Readonly<{
  point: IndoorPoint;
  kind: IndoorSnapKind;
  targetId?: string;
}>;

export type IndoorSnapOptions = Readonly<{
  /** Grid spacing in local units. Omit to leave the grid out of snapping. */
  gridStep?: number;
  /** Where a constrained drag started, for the axis lock. */
  axisOrigin?: IndoorPoint | null;
  axisLock?: boolean;
}>;

export type CollectSnapTargetsOptions = Readonly<{
  /** Excluded so a shape does not snap to the copy of itself being dragged. */
  excludeIds?: ReadonlySet<string>;
}>;

function rectangleCorners(geometry: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return [
    { x: geometry.x, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y },
    { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
    { x: geometry.x, y: geometry.y + geometry.height },
  ];
}

/** Everything on one level worth snapping to. */
export function collectSnapTargets(
  document: CampusIndoorDocument,
  levelId: string,
  options: CollectSnapTargetsOptions = {},
): IndoorSnapTargets {
  const excluded = options.excludeIds ?? new Set<string>();
  const points: IndoorSnapPointTarget[] = [];
  const segments: IndoorSnapSegmentTarget[] = [];

  for (const wall of document.walls) {
    if (wall.levelId !== levelId || excluded.has(wall.id)) continue;
    wall.points.forEach((point, index) => {
      points.push({ kind: "vertex", point, id: `${wall.id}:${index}` });
    });
    for (const segment of wallSegments(wall)) {
      segments.push({
        id: `${wall.id}:${segment.index}`,
        start: segment.start,
        end: segment.end,
      });
    }
  }

  for (const space of document.spaces) {
    if (space.levelId !== levelId || excluded.has(space.id)) continue;
    const geometry = space.geometry;
    const corners =
      geometry.type === "rectangle"
        ? rectangleCorners(geometry)
        : geometry.type === "polygon"
          ? geometry.points
          : [];
    corners.forEach((point, index) => {
      points.push({ kind: "corner", point, id: `${space.id}:${index}` });
    });
  }

  for (const connector of document.connectors) {
    if (!connector.levelIds.includes(levelId) || excluded.has(connector.id)) {
      continue;
    }
    points.push({
      kind: "node",
      point: connector.position,
      id: connector.id,
    });
  }

  for (const node of document.routeNodes) {
    if (node.levelId !== levelId || excluded.has(node.id)) continue;
    points.push({ kind: "node", point: node.position, id: node.id });
  }

  return { points, segments };
}

/**
 * Constrains a point to the nearest horizontal, vertical or 45 degree line
 * through the drag origin. This is what a held Shift does.
 */
export function applyAxisLock(
  origin: IndoorPoint,
  point: IndoorPoint,
): IndoorPoint {
  const deltaX = point.x - origin.x;
  const deltaY = point.y - origin.y;
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);

  // Closer to a diagonal than to either axis: project onto the diagonal.
  if (Math.abs(absoluteX - absoluteY) < Math.max(absoluteX, absoluteY) / 2) {
    const magnitude = (absoluteX + absoluteY) / 2;
    return {
      x: origin.x + Math.sign(deltaX) * magnitude,
      y: origin.y + Math.sign(deltaY) * magnitude,
    };
  }
  return absoluteX > absoluteY
    ? { x: point.x, y: origin.y }
    : { x: origin.x, y: point.y };
}

function distance(left: IndoorPoint, right: IndoorPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

/**
 * Snaps a candidate point, preferring what an author is most likely to have
 * meant: an existing vertex, then a room corner or node, then anywhere along a
 * wall, and only then the grid.
 */
export function snapPoint(
  candidate: IndoorPoint,
  targets: IndoorSnapTargets,
  toleranceUnits: number,
  options: IndoorSnapOptions = {},
): IndoorSnapResult {
  const constrained =
    options.axisLock && options.axisOrigin
      ? applyAxisLock(options.axisOrigin, candidate)
      : candidate;

  const priority: Record<IndoorSnapPointTarget["kind"], number> = {
    vertex: 0,
    corner: 1,
    node: 2,
  };

  let best: (IndoorSnapResult & { rank: number; gap: number }) | null = null;
  for (const target of targets.points) {
    const gap = distance(constrained, target.point);
    if (gap > toleranceUnits) continue;
    const rank = priority[target.kind];
    if (best && (best.rank < rank || (best.rank === rank && best.gap <= gap))) {
      continue;
    }
    best = {
      point: target.point,
      kind: target.kind,
      targetId: target.id,
      rank,
      gap,
    };
  }
  if (best) {
    return { point: best.point, kind: best.kind, targetId: best.targetId };
  }

  let closestEdge: (IndoorSnapResult & { gap: number }) | null = null;
  for (const segment of targets.segments) {
    const point = closestPointOnIndoorSegment(
      constrained,
      segment.start,
      segment.end,
    );
    const gap = distance(constrained, point);
    if (gap > toleranceUnits) continue;
    if (closestEdge && closestEdge.gap <= gap) continue;
    closestEdge = { point, kind: "edge", targetId: segment.id, gap };
  }
  if (closestEdge) {
    return {
      point: closestEdge.point,
      kind: "edge",
      targetId: closestEdge.targetId,
    };
  }

  if (options.gridStep && options.gridStep > 0) {
    return {
      point: {
        x: snapToGrid(constrained.x, options.gridStep),
        y: snapToGrid(constrained.y, options.gridStep),
      },
      kind: "grid",
    };
  }

  return { point: constrained, kind: "free" };
}
