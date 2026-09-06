// Generate illustrative tree geometry at surveyed OpenStreetMap node locations.
import { readFile, writeFile } from "node:fs/promises";
const source = JSON.parse(
  await readFile(
    new URL("../public/map-data/anu-trees.json", import.meta.url),
    "utf8",
  ),
);
const features = source.elements.flatMap(({ id, lon: x, lat: y }) =>
  [
    ["trunk", 0.4, 0, 3],
    ["crown", 3.5, 2.5, 5.5],
    ["top", 2.4, 5.5, 7],
  ].map(([part, radius, base, height]) => ({
    type: "Feature",
    id: `${id}:${part}`,
    properties: { part, base, height, osmId: id },
    geometry: {
      type: "Polygon",
      coordinates: [
        Array.from({ length: 13 }, (_, i) => [
          x +
            (Math.cos((i * Math.PI) / 6) * radius) /
              111320 /
              Math.cos((y * Math.PI) / 180),
          y + (Math.sin((i * Math.PI) / 6) * radius) / 111320,
        ]),
      ],
    },
  })),
);
await writeFile(
  new URL("../public/map-data/anu-trees-3d.geojson", import.meta.url),
  JSON.stringify({ type: "FeatureCollection", features }),
);
