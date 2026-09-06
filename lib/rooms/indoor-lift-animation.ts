import type { FeatureCollection } from "geojson";
import type { IndoorSceneCollection } from "@/lib/rooms/indoor-3d";

const DWELL_MS = 1200;
const TRAVEL_MS = 2800;

/** An illustrative return journey, stopping only at the floors this lift serves. */
export function liftCabinBase(stops: readonly number[], elapsedMs: number) {
  if (stops.length < 2) return stops[0] ?? 0;
  const journey = [...stops, ...stops.slice(1, -1).reverse()];
  const phase = Math.max(0, elapsedMs) / (DWELL_MS + TRAVEL_MS);
  const index = Math.floor(phase) % journey.length;
  const from = journey[index];
  const to = journey[(index + 1) % journey.length];
  const travel = Math.max(
    0,
    ((phase % 1) * (DWELL_MS + TRAVEL_MS) - DWELL_MS) / TRAVEL_MS,
  );
  const eased = travel * travel * (3 - 2 * travel);
  return from + (to - from) * eased;
}

export function buildLiftCabins(
  connectors: IndoorSceneCollection,
  elapsedMs: number,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: connectors.features.flatMap((shaft) => {
      if (shaft.properties.kind !== "lift" || shaft.geometry.type !== "Polygon")
        return [];
      const stops = JSON.parse(
        String(shaft.properties.liftStops ?? "[]"),
      ) as number[];
      if (!stops.length) return [];
      const ring = shaft.geometry.coordinates[0];
      const corners = ring.slice(0, -1);
      const centre = corners.reduce(
        ([x, y], point) => [
          x + point[0] / corners.length,
          y + point[1] / corners.length,
        ],
        [0, 0],
      );
      const base = liftCabinBase(stops, elapsedMs);
      const height = Number(shaft.properties.cabinHeight ?? 2.2);
      const xs = corners.map((point) => point[0]);
      const ys = corners.map((point) => point[1]);
      const width = (Math.max(...xs) - Math.min(...xs)) * 0.72;
      const depth = (Math.max(...ys) - Math.min(...ys)) * 0.72;
      const left = centre[0] - width / 2;
      const front = centre[1] - depth / 2;
      const dwell = Math.max(0, elapsedMs) % (DWELL_MS + TRAVEL_MS);
      const opening =
        stops.length > 1 && dwell < DWELL_MS
          ? Math.min(1, dwell / 300, (DWELL_MS - dwell) / 300)
          : 0;
      const gap = opening * 0.4;
      function part(
        name: string,
        x0: number,
        x1: number,
        y0: number,
        y1: number,
        bottom: number,
        top: number,
      ) {
        const x = (value: number) => left + width * value;
        const y = (value: number) => front + depth * value;
        return {
          type: "Feature" as const,
          id: `${shaft.id}-cabin-${name}`,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [x(x0), y(y0)],
                [x(x1), y(y0)],
                [x(x1), y(y1)],
                [x(x0), y(y1)],
                [x(x0), y(y0)],
              ],
            ],
          },
          properties: {
            connectorId: shaft.properties.connectorId,
            highlight: shaft.properties.highlight ?? false,
            part: name,
            base: base + bottom,
            height: base + top,
          },
        };
      }
      return [
        part("body", 0, 1, 0, 1, 0, height),
        part("roof", -0.03, 1.03, -0.03, 1.03, height, height + 0.12),
        part("left-door", 0.08, 0.49 - gap, -0.035, -0.01, 0.12, height - 0.32),
        part(
          "right-door",
          0.51 + gap,
          0.92,
          -0.035,
          -0.01,
          0.12,
          height - 0.32,
        ),
        part(
          "indicator",
          0.38,
          0.62,
          -0.04,
          -0.015,
          height - 0.24,
          height - 0.12,
        ),
      ];
    }),
  };
}
