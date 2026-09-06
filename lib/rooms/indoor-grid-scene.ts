import type { FeatureCollection, LineString } from "geojson";
import { rotateDrawingPoint } from "@/lib/rooms/indoor-orientation";
import { gridStepsForScale } from "@/lib/rooms/indoor-grid";
import {
  unprojectIndoorPoint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";

export function buildIndoorGrid(
  projection: IndoorFootprintProjection,
  angle: number,
  scale: number,
): FeatureCollection<LineString> {
  const corners = [
    { x: 0, y: 0 },
    { x: projection.viewBox.width, y: 0 },
    { x: projection.viewBox.width, y: projection.viewBox.height },
    { x: 0, y: projection.viewBox.height },
  ].map((point) => rotateDrawingPoint(point, -angle));
  const xs = corners.map((point) => point.x),
    ys = corners.map((point) => point.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const { minorUnits, majorUnits } = gridStepsForScale(scale);
  const features: FeatureCollection<LineString>["features"] = [];
  const position = (x: number, y: number) => [
    ...unprojectIndoorPoint(projection, rotateDrawingPoint({ x, y }, angle)),
  ];
  // Cap work when an unusually large footprint is viewed at high zoom.
  const step = Math.max(
    minorUnits,
    Math.ceil(Math.max(maxX - minX, maxY - minY) / 1000 / minorUnits) *
      minorUnits,
  );
  for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step)
    features.push({
      type: "Feature",
      properties: {
        major: Math.abs(x / majorUnits - Math.round(x / majorUnits)) < 1e-6,
      },
      geometry: {
        type: "LineString",
        coordinates: [position(x, minY), position(x, maxY)],
      },
    });
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step)
    features.push({
      type: "Feature",
      properties: {
        major: Math.abs(y / majorUnits - Math.round(y / majorUnits)) < 1e-6,
      },
      geometry: {
        type: "LineString",
        coordinates: [position(minX, y), position(maxX, y)],
      },
    });
  return { type: "FeatureCollection", features };
}
