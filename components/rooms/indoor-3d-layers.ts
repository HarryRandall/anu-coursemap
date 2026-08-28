import type { IndoorScene } from "@/lib/rooms/indoor-3d";

/**
 * Adds and updates the layers that draw a building's interior on the campus
 * map. Everything is a fill extrusion, so the inside of a building is made of
 * the same stuff as the outside and one camera move carries you from the campus
 * into a room.
 */
type MapLibreMap = import("maplibre-gl").Map;

function emptyCollection(): import("maplibre-gl").GeoJSONSourceSpecification["data"] {
  return { type: "FeatureCollection", features: [] };
}

export const INDOOR_SOURCE_IDS = {
  slabs: "coursemap-indoor-slabs",
  rooms: "coursemap-indoor-rooms",
  walls: "coursemap-indoor-walls",
  openings: "coursemap-indoor-openings",
  connectors: "coursemap-indoor-connectors",
  route: "coursemap-indoor-route",
  labels: "coursemap-indoor-labels",
} as const;

export const INDOOR_LAYER_IDS = {
  slabsInactive: "coursemap-indoor-slabs-inactive-3d",
  slabs: "coursemap-indoor-slabs-3d",
  roomsInactive: "coursemap-indoor-rooms-inactive-3d",
  rooms: "coursemap-indoor-rooms-3d",
  perimetersInactive: "coursemap-indoor-perimeters-inactive-3d",
  perimeters: "coursemap-indoor-perimeters-3d",
  wallsInactive: "coursemap-indoor-walls-inactive-3d",
  walls: "coursemap-indoor-walls-3d",
  openingsInactive: "coursemap-indoor-openings-inactive-3d",
  openings: "coursemap-indoor-openings-3d",
  connectors: "coursemap-indoor-connectors-3d",
  connectorsRoute: "coursemap-indoor-connectors-route-3d",
  routeInactive: "coursemap-indoor-route-inactive-3d",
  route: "coursemap-indoor-route-3d",
  labelsInactive: "coursemap-indoor-labels-inactive-symbol",
  labels: "coursemap-indoor-labels-symbol",
} as const;

/** Every indoor layer, so the outdoor map can be dimmed behind them. */
export const INDOOR_LAYER_ID_LIST = Object.values(INDOOR_LAYER_IDS);

/** Layers the editor can select without reaching through to another floor. */
export const INDOOR_PICKABLE_LAYER_ID_LIST = [
  INDOOR_LAYER_IDS.rooms,
  INDOOR_LAYER_IDS.perimeters,
  INDOOR_LAYER_IDS.walls,
  INDOOR_LAYER_IDS.openings,
  INDOOR_LAYER_IDS.connectors,
  INDOOR_LAYER_IDS.connectorsRoute,
  INDOOR_LAYER_IDS.route,
] as const;

const INDOOR_LAYER_DRAW_ORDER = [
  INDOOR_LAYER_IDS.slabs,
  INDOOR_LAYER_IDS.rooms,
  INDOOR_LAYER_IDS.perimeters,
  INDOOR_LAYER_IDS.walls,
  INDOOR_LAYER_IDS.openings,
  INDOOR_LAYER_IDS.connectors,
  INDOOR_LAYER_IDS.connectorsRoute,
  INDOOR_LAYER_IDS.route,
  INDOOR_LAYER_IDS.slabsInactive,
  INDOOR_LAYER_IDS.roomsInactive,
  INDOOR_LAYER_IDS.perimetersInactive,
  INDOOR_LAYER_IDS.wallsInactive,
  INDOOR_LAYER_IDS.openingsInactive,
  INDOOR_LAYER_IDS.routeInactive,
  INDOOR_LAYER_IDS.labelsInactive,
  INDOOR_LAYER_IDS.labels,
] as const;

export function addIndoorLayers(map: MapLibreMap, beforeId?: string) {
  for (const sourceId of Object.values(INDOOR_SOURCE_IDS)) {
    if (map.getSource(sourceId)) continue;
    map.addSource(sourceId, { type: "geojson", data: emptyCollection() });
  }

  // MapLibre opacity is fixed per fill-extrusion layer. Active and inactive
  // features therefore need separate filtered layers rather than a data
  // expression, which MapLibre rejects at runtime.
  if (!map.getLayer(INDOOR_LAYER_IDS.slabsInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.slabsInactive,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.slabs,
      filter: ["==", ["get", "active"], false],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#d4d4d8",
        "fill-extrusion-opacity": 0.1,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.slabs)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.slabs,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.slabs,
      filter: ["==", ["get", "active"], true],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#d4d4d8",
        // A floor plate has to read as a plate without becoming a lid over the
        // floor beneath it.
        "fill-extrusion-opacity": 0.2,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.rooms)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.rooms,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.rooms,
      filter: ["==", ["get", "active"], true],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": [
          "case",
          ["get", "highlight"],
          "#7c3aed",
          ["==", ["get", "kind"], "corridor"],
          "#dbeafe",
          ["==", ["get", "kind"], "service"],
          "#fef3c7",
          ["==", ["get", "kind"], "open-area"],
          "#dcfce7",
          "#ede9fe",
        ],
        "fill-extrusion-opacity": 0.95,
        "fill-extrusion-vertical-gradient": true,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.roomsInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.roomsInactive,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.rooms,
      filter: ["==", ["get", "active"], false],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": [
          "case",
          ["==", ["get", "kind"], "corridor"],
          "#bfdbfe",
          ["==", ["get", "kind"], "service"],
          "#fde68a",
          ["==", ["get", "kind"], "open-area"],
          "#bbf7d0",
          "#ddd6fe",
        ],
        "fill-extrusion-opacity": 0.28,
        "fill-extrusion-vertical-gradient": true,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.perimeters)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.perimeters,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.walls,
      filter: [
        "all",
        ["==", ["get", "active"], true],
        ["==", ["get", "perimeter"], true],
      ],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#52525b",
        "fill-extrusion-opacity": 0.35,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.perimetersInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.perimetersInactive,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.walls,
      filter: [
        "all",
        ["==", ["get", "active"], false],
        ["==", ["get", "perimeter"], true],
      ],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#a1a1aa",
        "fill-extrusion-opacity": 0.12,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.walls)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.walls,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.walls,
      filter: [
        "all",
        ["==", ["get", "active"], true],
        ["!=", ["get", "perimeter"], true],
      ],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": [
          "match",
          ["get", "kind"],
          "glazing",
          "#7dd3fc",
          "partition",
          "#a1a1aa",
          "#52525b",
        ],
        "fill-extrusion-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.wallsInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.wallsInactive,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.walls,
      filter: [
        "all",
        ["==", ["get", "active"], false],
        ["!=", ["get", "perimeter"], true],
      ],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": [
          "match",
          ["get", "kind"],
          "glazing",
          "#7dd3fc",
          "partition",
          "#a1a1aa",
          "#71717a",
        ],
        "fill-extrusion-opacity": 0.24,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.openings)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.openings,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.openings,
      filter: ["==", ["get", "active"], true],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": [
          "case",
          ["get", "exterior"],
          "#059669",
          ["==", ["get", "kind"], "door"],
          "#7c3aed",
          "#0284c7",
        ],
        "fill-extrusion-opacity": 0.98,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.openingsInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.openingsInactive,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.openings,
      filter: ["==", ["get", "active"], false],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": [
          "case",
          ["get", "exterior"],
          "#6ee7b7",
          ["==", ["get", "kind"], "door"],
          "#c4b5fd",
          "#7dd3fc",
        ],
        "fill-extrusion-opacity": 0.48,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.connectors)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.connectors,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.connectors,
      filter: ["!=", ["get", "onRoute"], true],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#8b5cf6",
        "fill-extrusion-opacity": 0.55,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.connectorsRoute)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.connectorsRoute,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.connectors,
      filter: ["==", ["get", "onRoute"], true],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        // A shaft on the route is lit its whole length, which is what says
        // "go up here" without any words.
        "fill-extrusion-color": "#f59e0b",
        "fill-extrusion-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.route)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.route,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.route,
      filter: ["==", ["get", "active"], true],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#f59e0b",
        "fill-extrusion-opacity": 1,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.routeInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.routeInactive,
      type: "fill-extrusion",
      source: INDOOR_SOURCE_IDS.route,
      filter: ["==", ["get", "active"], false],
      paint: {
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#f59e0b",
        "fill-extrusion-opacity": 0.32,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.labelsInactive)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.labelsInactive,
      type: "symbol",
      source: INDOOR_SOURCE_IDS.labels,
      filter: ["==", ["get", "active"], false],
      layout: {
        "text-field": ["concat", ["get", "levelRef"], " · ", ["get", "label"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        // Inactive labels must not claim collision space from the selected
        // floor. Their floor prefix keeps overlapping room references clear.
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-placement": "point",
      },
      paint: {
        "text-color": "#71717a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
        "text-opacity": 0.48,
      },
    });
  }

  if (!map.getLayer(INDOOR_LAYER_IDS.labels)) {
    map.addLayer({
      id: INDOOR_LAYER_IDS.labels,
      type: "symbol",
      source: INDOOR_SOURCE_IDS.labels,
      // Active labels keep their full emphasis and collision behaviour. The
      // faint sibling layer ignores placement, so it cannot hide these.
      filter: ["==", ["get", "active"], true],
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-allow-overlap": false,
        "symbol-placement": "point",
      },
      paint: {
        "text-color": ["case", ["get", "highlight"], "#5b21b6", "#3f3f46"],
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.4,
        "text-opacity": 1,
      },
    });
  }

  // Transparent extrusions still participate in depth testing. Draw the active
  // floor first, then the faded floors, with labels above both. This
  // stops a transparent upper floor from masking the room being inspected.
  const insertionPoint =
    beforeId && map.getLayer(beforeId) ? beforeId : undefined;
  for (const layerId of INDOOR_LAYER_DRAW_ORDER) {
    if (map.getLayer(layerId)) map.moveLayer(layerId, insertionPoint);
  }
}

export function updateIndoorLayers(
  map: MapLibreMap,
  scene: IndoorScene | null,
) {
  for (const [key, sourceId] of Object.entries(INDOOR_SOURCE_IDS)) {
    const source = map.getSource(sourceId) as
      { setData: (data: unknown) => void } | undefined;
    if (!source) continue;
    source.setData(
      scene ? scene[key as keyof typeof INDOOR_SOURCE_IDS] : emptyCollection(),
    );
  }

  const visibility = scene ? "visible" : "none";
  for (const layerId of INDOOR_LAYER_ID_LIST) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }

  // Mirrored onto the container so the rendered interior can be verified from
  // outside the map, the same way the outdoor building state already is.
  const container = map.getContainer();
  if (!scene) {
    delete container.dataset.indoorLevels;
    delete container.dataset.indoorRooms;
    delete container.dataset.indoorTopMetres;
    delete container.dataset.indoorFloorBases;
    return;
  }
  const levelBases = new Map<string, number>();
  for (const feature of scene.slabs.features) {
    levelBases.set(
      String(feature.properties.levelId),
      Number(feature.properties.base),
    );
  }
  container.dataset.indoorLevels = String(levelBases.size);
  container.dataset.indoorRooms = String(scene.rooms.features.length);
  container.dataset.indoorTopMetres = scene.topMetres.toFixed(1);
  container.dataset.indoorFloorBases = [...levelBases.values()]
    .map((base) => base.toFixed(1))
    .join(",");
}
