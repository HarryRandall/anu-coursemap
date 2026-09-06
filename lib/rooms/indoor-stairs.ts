import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { IndoorSceneCollection } from "@/lib/rooms/indoor-3d";

/** Illustrative switchback flights between the visible floors served by stairs. */
export function buildStairFlights(
  connectors: IndoorSceneCollection,
): FeatureCollection {
  const features: Feature<Polygon>[] = [];
  for (const shaft of connectors.features) {
    if (shaft.properties.kind !== "stairs" || shaft.geometry.type !== "Polygon")
      continue;
    const stops = JSON.parse(
      String(shaft.properties.liftStops ?? "[]"),
    ) as number[];
    const ring = shaft.geometry.coordinates[0];
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    const shaftWidth = Math.max(...xs) - Math.min(...xs);
    const shaftDepth = Math.max(...ys) - Math.min(...ys);
    const width = shaftWidth * 1.5;
    const depth = shaftDepth * 2.5;
    const left = (Math.min(...xs) + Math.max(...xs) - width) / 2;
    const front = (Math.min(...ys) + Math.max(...ys) - depth) / 2;
    function part(
      id: string,
      x0: number,
      x1: number,
      y0: number,
      y1: number,
      top: number,
      thickness = 0.3,
    ) {
      const point = (x: number, y: number) => [
        left + x * width,
        front + y * depth,
      ];
      features.push({
        type: "Feature",
        id: `${shaft.id}-${id}`,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              point(x0, y0),
              point(x1, y0),
              point(x1, y1),
              point(x0, y1),
              point(x0, y0),
            ],
          ],
        },
        properties: {
          connectorId: shaft.properties.connectorId,
          highlight: shaft.properties.highlight ?? false,
          base: Math.max(stops[0], top - thickness),
          height: top,
          part: id.includes("landing") ? "landing" : "tread",
        },
      });
    }
    for (let floor = 0; floor < stops.length - 1; floor++) {
      const bottom = stops[floor];
      const rise = stops[floor + 1] - bottom;
      if (rise <= 0) continue;
      const steps = 10;
      for (let step = 0; step < steps; step++) {
        const y0 = 0.12 + (step / steps) * 0.7;
        const y1 = 0.12 + ((step + 1) / steps) * 0.7;
        part(
          `${floor}-up-${step}`,
          0.05,
          0.46,
          y0,
          y1,
          bottom + (rise * (step + 1)) / (steps * 2),
          rise / (steps * 2) + 0.2,
        );
        part(
          `${floor}-return-${step}`,
          0.54,
          0.95,
          0.94 - y1,
          0.94 - y0,
          bottom + rise * (0.5 + (step + 1) / (steps * 2)),
          rise / (steps * 2) + 0.2,
        );
      }
      part(`${floor}-half-landing`, 0.05, 0.95, 0.82, 0.98, bottom + rise / 2);
      part(`${floor}-top-landing`, 0.05, 0.95, 0, 0.12, bottom + rise);
    }
  }
  return { type: "FeatureCollection", features };
}
