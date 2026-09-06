import type { IndoorPoint } from "@/lib/rooms/indoor-map";

export function rotateDrawingPoint(
  point: IndoorPoint,
  degrees: number,
): IndoorPoint {
  const angle = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
  };
}

export function alignedRectangle(
  origin: IndoorPoint,
  current: IndoorPoint,
  degrees = 0,
): IndoorPoint[] {
  const a = rotateDrawingPoint(origin, -degrees);
  const b = rotateDrawingPoint(current, -degrees);
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y },
  ].map((point) => rotateDrawingPoint(point, degrees));
}

/** Use the longest footprint edge as the building's drawing axis. */
export function buildingDrawingAngle(outline: readonly IndoorPoint[]): number {
  let length = 0;
  let angle = 0;
  outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length];
    const distance = Math.hypot(next.x - point.x, next.y - point.y);
    if (distance > length) {
      length = distance;
      angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
    }
  });
  return Math.round((((((angle + 45) % 90) + 90) % 90) - 45) * 10) / 10;
}
