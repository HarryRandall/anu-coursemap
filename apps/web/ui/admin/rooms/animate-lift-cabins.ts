import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import {
  INDOOR_LAYER_IDS,
  INDOOR_SOURCE_IDS,
} from "@/ui/rooms/indoor-3d-layers";
import { buildLiftCabins } from "@/lib/rooms/indoor-lift-animation";
import type { IndoorSceneCollection } from "@/lib/rooms/indoor-3d";
import type { IndoorPalette } from "@/lib/rooms/indoor-palette";

import { buildStairFlights } from "@/lib/rooms/indoor-stairs";

const STAIRS = "coursemap-illustrative-stairs";
const CABINS = "coursemap-illustrative-lift-cabins";
const SHAFTS = "coursemap-illustrative-lift-shafts";

/** Preview-only movement. Never changes the indoor document or routing data. */
export function animateLiftCabins(
  map: MapLibreMap,
  connectors: IndoorSceneCollection,
  palette: IndoorPalette,
) {
  const layers = [
    INDOOR_LAYER_IDS.connectors,
    INDOOR_LAYER_IDS.connectorsRoute,
  ];
  const filters = layers.map((id) => map.getFilter(id));
  layers.forEach((id, index) =>
    map.setFilter(id, [
      "all",
      (filters[index] ?? true) as ExpressionSpecification,
      [
        "!",
        [
          "any",
          ["==", ["get", "kind"], "lift"],
          [
            "all",
            ["==", ["get", "kind"], "stairs"],
            [">", ["get", "servedFloorCount"], 1],
          ],
        ],
      ],
    ]),
  );
  map.addSource(STAIRS, {
    type: "geojson",
    data: buildStairFlights(connectors),
  });
  map.addLayer({
    id: STAIRS,
    type: "fill-extrusion",
    source: STAIRS,
    paint: {
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-color": [
        "case",
        ["==", ["get", "highlight"], true],
        palette.selection,
        [
          "match",
          ["get", "part"],
          "landing",
          palette.wallStructural,
          palette.wallPartition,
        ],
      ],
      "fill-extrusion-opacity": 0.96,
    },
  });
  map.moveLayer(STAIRS, INDOOR_LAYER_IDS.slabsInactive);
  map.addSource(CABINS, {
    type: "geojson",
    data: buildLiftCabins(connectors, 0),
  });
  map.addLayer({
    id: SHAFTS,
    type: "fill-extrusion",
    source: INDOOR_SOURCE_IDS.connectors,
    filter: ["==", ["get", "kind"], "lift"],
    paint: {
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-color": palette.connector,
      "fill-extrusion-opacity": 0.16,
    },
  });
  map.addLayer({
    id: CABINS,
    type: "fill-extrusion",
    source: CABINS,
    paint: {
      "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-color": [
        "case",
        ["==", ["get", "highlight"], true],
        palette.selection,
        [
          "match",
          ["get", "part"],
          "body",
          palette.wallStructural,
          "roof",
          palette.wallPartition,
          "indicator",
          palette.connector,
          palette.labelText,
        ],
      ],
      "fill-extrusion-opacity": 0.96,
    },
  });
  // Transparent extrusions still write depth. Render the cabin before the
  // floors and glass so their translucent faces do not fully occlude it.
  map.moveLayer(CABINS, INDOOR_LAYER_IDS.slabsInactive);
  map.moveLayer(SHAFTS);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = 0;
  const started = performance.now();
  function draw(elapsed: number) {
    (map.getSource(CABINS) as GeoJSONSource).setData(
      buildLiftCabins(connectors, elapsed),
    );
  }
  function tick(now: number) {
    if (now - last >= 50) {
      draw(now - started);
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) draw(0);
    else if (
      !document.hidden &&
      connectors.features.some((feature) => feature.properties.kind === "lift")
    )
      frame = requestAnimationFrame(tick);
  }
  reducedMotion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    cancelAnimationFrame(frame);
    reducedMotion.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    if (!map.getLayer(CABINS)) return;
    map.removeLayer(STAIRS);
    map.removeSource(STAIRS);
    map.removeLayer(CABINS);
    map.removeLayer(SHAFTS);
    map.removeSource(CABINS);
    layers.forEach((id, index) => map.setFilter(id, filters[index] ?? null));
  };
}
