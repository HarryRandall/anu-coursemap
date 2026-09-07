import type { IndoorPoint, IndoorSpaceGeometry } from "@/lib/rooms/indoor-map";
import {
  indoorGeometryRing,
  translateIndoorGeometry,
} from "@/lib/rooms/indoor-geometry";
import {
  isIndoorRingWithinFootprint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";

/** Stop a dragged room at the boundary instead of rejecting the whole move. */
export function constrainIndoorMove(
  geometry: IndoorSpaceGeometry,
  delta: IndoorPoint,
  footprint: IndoorFootprintProjection,
): IndoorPoint {
  const fits = (fraction: number) =>
    isIndoorRingWithinFootprint(
      indoorGeometryRing(
        translateIndoorGeometry(geometry, {
          x: delta.x * fraction,
          y: delta.y * fraction,
        }),
      ),
      footprint,
    );
  if (fits(1)) return delta;
  if (!fits(0)) return { x: 0, y: 0 };
  let low = 0,
    high = 1;
  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return { x: delta.x * low, y: delta.y * low };
}
