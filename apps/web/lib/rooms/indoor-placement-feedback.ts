import type { IndoorPoint, CampusIndoorSpace } from "@/lib/rooms/indoor-map";
import {
  indoorGeometryRing,
  isIndoorPointWithinPolygon,
} from "@/lib/rooms/indoor-geometry";

/** Exact crossing points for temporary collision markers. */
export function ringContacts(
  a: readonly IndoorPoint[],
  b: readonly IndoorPoint[],
): IndoorPoint[] {
  const points: IndoorPoint[] = [];
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      const p = a[i],
        q = b[j],
        p1 = a[(i + 1) % a.length],
        q1 = b[(j + 1) % b.length];
      const dx = p1.x - p.x,
        dy = p1.y - p.y,
        ex = q1.x - q.x,
        ey = q1.y - q.y;
      const denominator = dx * ey - dy * ex;
      if (Math.abs(denominator) < 1e-8) continue;
      const t = ((q.x - p.x) * ey - (q.y - p.y) * ex) / denominator;
      const u = ((q.x - p.x) * dy - (q.y - p.y) * dx) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
        points.push({ x: p.x + t * dx, y: p.y + t * dy });
    }
  return points;
}

export function overlappingRooms(
  ring: readonly IndoorPoint[],
  spaces: readonly CampusIndoorSpace[],
  excludeId?: string,
) {
  return spaces.filter((space) => {
    if (space.id === excludeId || space.kind !== "room") return false;
    const other = indoorGeometryRing(space.geometry);
    return (
      ringContacts(ring, other).length > 0 ||
      ring.some((point) => isIndoorPointWithinPolygon(point, other)) ||
      other.some((point) => isIndoorPointWithinPolygon(point, ring))
    );
  });
}
