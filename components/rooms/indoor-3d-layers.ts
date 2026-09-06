import type { IndoorScene } from "@/lib/rooms/indoor-3d";
import {
  DEFAULT_INDOOR_PALETTE,
  spaceFillExpression,
  type IndoorPalette,
} from "@/lib/rooms/indoor-palette";

/**
 * Adds and updates the layers that draw a building's interior on the campus
 * map. Everything is a fill extrusion, so the inside of a building is made of
 * the same stuff as the outside and one camera move carries you from the campus
 * into a room. Colours come from an {@link IndoorPalette} so the editor can
 * repaint for dark mode without rebuilding the layers.
 */
type MapLibreMap = import("maplibre-gl").Map;
type Expression = import("maplibre-gl").ExpressionSpecification;

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

/** The editor's layer visibility groups, in the order they are listed. */
export type IndoorLayerGroup =
  "spaces" | "walls" | "doors" | "connectors" | "routing" | "labels";

export const INDOOR_LAYER_GROUPS: Readonly<
  Record<IndoorLayerGroup, readonly string[]>
> = {
  spaces: [INDOOR_LAYER_IDS.rooms, INDOOR_LAYER_IDS.roomsInactive],
  walls: [
    INDOOR_LAYER_IDS.walls,
    INDOOR_LAYER_IDS.wallsInactive,
    INDOOR_LAYER_IDS.perimeters,
    INDOOR_LAYER_IDS.perimetersInactive,
  ],
  doors: [INDOOR_LAYER_IDS.openings, INDOOR_LAYER_IDS.openingsInactive],
  connectors: [INDOOR_LAYER_IDS.connectors, INDOOR_LAYER_IDS.connectorsRoute],
  routing: [INDOOR_LAYER_IDS.route, INDOOR_LAYER_IDS.routeInactive],
  labels: [INDOOR_LAYER_IDS.labels, INDOOR_LAYER_IDS.labelsInactive],
};

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

function wallColour(palette: IndoorPalette): Expression {
  return [
    "match",
    ["get", "kind"],
    "glazing",
    palette.wallGlazing,
    "partition",
    palette.wallPartition,
    palette.wallStructural,
  ];
}

function openingColour(palette: IndoorPalette): Expression {
  return [
    "case",
    ["boolean", ["get", "exterior"], false],
    palette.entrance,
    ["==", ["get", "kind"], "door"],
    palette.door,
    palette.gap,
  ];
}

function labelColour(palette: IndoorPalette): Expression {
  return [
    "case",
    ["boolean", ["get", "highlight"], false],
    palette.labelHighlight,
    palette.labelText,
  ];
}

/**
 * Every colour-bearing paint property, keyed by layer. `addIndoorLayers` and
 * `applyIndoorPalette` share this so a theme change repaints exactly what was
 * first drawn.
 */
function paintColours(
  palette: IndoorPalette,
): Readonly<Record<string, Readonly<Record<string, string | Expression>>>> {
  const spaceFill = spaceFillExpression(palette);
  return {
    [INDOOR_LAYER_IDS.slabsInactive]: { "fill-extrusion-color": palette.slab },
    [INDOOR_LAYER_IDS.slabs]: { "fill-extrusion-color": palette.slab },
    [INDOOR_LAYER_IDS.rooms]: { "fill-extrusion-color": spaceFill },
    [INDOOR_LAYER_IDS.roomsInactive]: { "fill-extrusion-color": spaceFill },
    [INDOOR_LAYER_IDS.perimeters]: {
      "fill-extrusion-color": palette.perimeter,
    },
    [INDOOR_LAYER_IDS.perimetersInactive]: {
      "fill-extrusion-color": palette.perimeter,
    },
    [INDOOR_LAYER_IDS.walls]: { "fill-extrusion-color": wallColour(palette) },
    [INDOOR_LAYER_IDS.wallsInactive]: {
      "fill-extrusion-color": wallColour(palette),
    },
    [INDOOR_LAYER_IDS.openings]: {
      "fill-extrusion-color": openingColour(palette),
    },
    [INDOOR_LAYER_IDS.openingsInactive]: {
      "fill-extrusion-color": openingColour(palette),
    },
    [INDOOR_LAYER_IDS.connectors]: {
      "fill-extrusion-color": palette.connector,
    },
    [INDOOR_LAYER_IDS.connectorsRoute]: {
      "fill-extrusion-color": palette.route,
    },
    [INDOOR_LAYER_IDS.route]: { "fill-extrusion-color": palette.route },
    [INDOOR_LAYER_IDS.routeInactive]: {
      "fill-extrusion-color": palette.route,
    },
    [INDOOR_LAYER_IDS.labelsInactive]: {
      "text-color": palette.labelMuted,
      "text-halo-color": palette.labelHalo,
    },
    [INDOOR_LAYER_IDS.labels]: {
      "text-color": labelColour(palette),
      "text-halo-color": palette.labelHalo,
    },
  };
}

/** Repaints every indoor layer for a new palette, for example on theme change. */
export function applyIndoorPalette(map: MapLibreMap, palette: IndoorPalette) {
  for (const [layerId, properties] of Object.entries(paintColours(palette))) {
    if (!map.getLayer(layerId)) continue;
    for (const [property, value] of Object.entries(properties)) {
      map.setPaintProperty(
        layerId,
        property as Parameters<MapLibreMap["setPaintProperty"]>[1],
        value,
      );
    }
  }
}

export function addIndoorLayers(
  map: MapLibreMap,
  beforeId?: string,
  palette: IndoorPalette = DEFAULT_INDOOR_PALETTE,
) {
  for (const sourceId of Object.values(INDOOR_SOURCE_IDS)) {
    if (map.getSource(sourceId)) continue;
    map.addSource(sourceId, { type: "geojson", data: emptyCollection() });
  }

  const colours = paintColours(palette);
  const colour = (layerId: string, property: string) =>
    colours[layerId][property];

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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.slabsInactive,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.slabs,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.rooms,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.roomsInactive,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.perimeters,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.perimetersInactive,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.walls,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.wallsInactive,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.openings,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.openingsInactive,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.connectors,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.connectorsRoute,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.route,
          "fill-extrusion-color",
        ),
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
        "fill-extrusion-color": colour(
          INDOOR_LAYER_IDS.routeInactive,
          "fill-extrusion-color",
        ),
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
        "text-color": colour(INDOOR_LAYER_IDS.labelsInactive, "text-color"),
        "text-halo-color": colour(
          INDOOR_LAYER_IDS.labelsInactive,
          "text-halo-color",
        ),
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
        "text-color": colour(INDOOR_LAYER_IDS.labels, "text-color"),
        "text-halo-color": colour(INDOOR_LAYER_IDS.labels, "text-halo-color"),
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
  hiddenGroups: ReadonlySet<IndoorLayerGroup> = new Set(),
) {
  for (const [key, sourceId] of Object.entries(INDOOR_SOURCE_IDS)) {
    const source = map.getSource(sourceId) as
      { setData: (data: unknown) => void } | undefined;
    if (!source) continue;
    source.setData(
      scene ? scene[key as keyof typeof INDOOR_SOURCE_IDS] : emptyCollection(),
    );
  }

  const hiddenLayerIds = new Set(
    [...hiddenGroups].flatMap((group) => INDOOR_LAYER_GROUPS[group]),
  );
  for (const layerId of INDOOR_LAYER_ID_LIST) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        scene && !hiddenLayerIds.has(layerId) ? "visible" : "none",
      );
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
