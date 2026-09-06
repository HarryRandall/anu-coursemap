"use client";
import { buildIndoorGrid } from "@/lib/rooms/indoor-grid-scene";
import type { CampusIndoorSpace } from "@/lib/rooms/indoor-map";

import { animateLiftCabins } from "@/components/admin/rooms/animate-lift-cabins";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  addIndoorLayers,
  applyIndoorPalette,
  INDOOR_PICKABLE_LAYER_ID_LIST,
  INDOOR_SOURCE_IDS,
  updateIndoorLayers,
  type IndoorLayerGroup,
} from "@/components/rooms/indoor-3d-layers";
import { Alert, AlertDescription } from "@reui/components/alert";
import { cn } from "@/lib/cn";
import type { IndoorScene } from "@/lib/rooms/indoor-3d";
import { buildIndoorDraftGeoJson } from "@/lib/rooms/indoor-draft";
import type { IndoorDrag } from "@/lib/rooms/indoor-drag";
import {
  projectIndoorPoint,
  unprojectIndoorPoint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";
import type { IndoorPoint } from "@/lib/rooms/indoor-map";
import {
  DEFAULT_INDOOR_PALETTE,
  type IndoorPalette,
} from "@/lib/rooms/indoor-palette";

/**
 * The editing surface: one real building footprint, in 2D or 3D.
 *
 * There is no separate floor plan. Selecting a floor drops the camera to look
 * straight down on that floor at its own height, and rooms, walls and paths are
 * drawn directly onto the building's actual footprint. The basemap stays out of
 * this view so nearby buildings cannot distract from the plan. Everything is
 * authored in local units, so the pure geometry, snapping and drag rules are
 * unchanged; this only converts between the map projection and those units.
 */
type MapLibreMap = import("maplibre-gl").Map;

const BACKGROUND_LAYER_ID = "coursemap-indoor-editor-background";

function editorMapStyle(
  palette: IndoorPalette,
): import("maplibre-gl").StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      {
        id: BACKGROUND_LAYER_ID,
        type: "background",
        paint: { "background-color": palette.background },
      },
    ],
  };
}

/** Looking straight down to draw; tilted to see the building as a whole. */
export const PLAN_PITCH = 0;
export const PERSPECTIVE_PITCH = 55;
const EDITOR_FRAME_PADDING = 64;
const EDITOR_MAX_ZOOM = 22;
const EDITOR_ZOOM_OUT_LEVELS = 1;
const EDITOR_BOUNDS_PADDING = 1;

const INDOOR_DRAFT_SOURCE_ID = "coursemap-indoor-draft";
const INDOOR_DRAFT_FILL_LAYER_ID = "coursemap-indoor-draft-fill";
const INDOOR_DRAFT_LINE_LAYER_ID = "coursemap-indoor-draft-line";
const INDOOR_DRAFT_VERTEX_LAYER_ID = "coursemap-indoor-draft-vertex";

function addIndoorDraftLayers(map: MapLibreMap, palette: IndoorPalette) {
  if (!map.getSource(INDOOR_DRAFT_SOURCE_ID)) {
    map.addSource(INDOOR_DRAFT_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer(INDOOR_DRAFT_FILL_LAYER_ID)) {
    map.addLayer({
      id: INDOOR_DRAFT_FILL_LAYER_ID,
      type: "fill",
      source: INDOOR_DRAFT_SOURCE_ID,
      filter: ["==", ["get", "draftKind"], "area"],
      paint: {
        "fill-color": ["get", "colour"],
        "fill-opacity": 0.24,
      },
    });
  }

  if (!map.getLayer(INDOOR_DRAFT_LINE_LAYER_ID)) {
    map.addLayer({
      id: INDOOR_DRAFT_LINE_LAYER_ID,
      type: "line",
      source: INDOOR_DRAFT_SOURCE_ID,
      filter: ["!=", ["get", "draftKind"], "vertex"],
      paint: {
        "line-color": ["get", "colour"],
        "line-dasharray": [2, 1],
        "line-opacity": 0.95,
        "line-width": 2.5,
      },
    });
  }

  if (!map.getLayer(INDOOR_DRAFT_VERTEX_LAYER_ID)) {
    map.addLayer({
      id: INDOOR_DRAFT_VERTEX_LAYER_ID,
      type: "circle",
      source: INDOOR_DRAFT_SOURCE_ID,
      filter: ["==", ["get", "draftKind"], "vertex"],
      paint: {
        "circle-color": ["get", "colour"],
        "circle-opacity": ["case", ["get", "preview"], 0.7, 1],
        "circle-radius": ["case", ["get", "preview"], 6, 4],
        "circle-stroke-color": palette.draftVertexStroke,
        "circle-stroke-width": 1.5,
      },
    });
  }
}

function repaint(map: MapLibreMap, palette: IndoorPalette) {
  if (map.getLayer("coursemap-selected-connector-marker")) {
    map.setPaintProperty(
      "coursemap-selected-connector-marker",
      "circle-color",
      palette.selection,
    );
    map.setPaintProperty(
      "coursemap-selected-connector-marker",
      "circle-stroke-color",
      palette.labelText,
    );
    map.setPaintProperty(
      "coursemap-selected-connector-label",
      "text-color",
      palette.labelText,
    );
    map.setPaintProperty(
      "coursemap-selected-connector-label",
      "text-halo-color",
      palette.background,
    );
  }
  if (map.getLayer("coursemap-selected-connector-outline")) {
    map.setPaintProperty(
      "coursemap-selected-connector-outline",
      "line-color",
      palette.labelText,
    );
  }
  if (map.getLayer(BACKGROUND_LAYER_ID)) {
    map.setPaintProperty(
      BACKGROUND_LAYER_ID,
      "background-color",
      palette.background,
    );
  }
  if (map.getLayer(INDOOR_DRAFT_VERTEX_LAYER_ID)) {
    map.setPaintProperty(
      INDOOR_DRAFT_VERTEX_LAYER_ID,
      "circle-stroke-color",
      palette.draftVertexStroke,
    );
  }
  applyIndoorPalette(map, palette);
}

export type IndoorPick = Readonly<{
  kind: "space" | "wall" | "opening" | "connector" | "route-node";
  id: string;
}>;

/** Camera controls the surrounding chrome can call. */
export type IndoorMapSurfaceHandle = Readonly<{
  zoomIn: () => void;
  zoomOut: () => void;
  /** Frames the current floor again. */
  resetView: () => void;
}>;

export type IndoorMapSurfaceProps = Readonly<{
  scene: IndoorScene | null;
  spaces?: readonly CampusIndoorSpace[];
  /** The active authoring gesture, rendered separately from saved geometry. */
  draft?: IndoorDrag | null;
  projection: IndoorFootprintProjection;
  centre: readonly [longitude: number, latitude: number];
  /** True while a drawing tool is active, so the map does not pan under it. */
  drawing: boolean;
  perspective: boolean;
  drawingAngle?: number;
  showGrid?: boolean;
  palette?: IndoorPalette;
  /** Layer groups switched off in the inspector. */
  hiddenLayers?: ReadonlySet<IndoorLayerGroup>;
  onWorldPointerDown?: (point: IndoorPoint, event: PointerEvent) => void;
  onWorldPointerMove?: (point: IndoorPoint, event: PointerEvent) => void;
  onWorldPointerUp?: (point: IndoorPoint, event: PointerEvent) => void;
  onWorldDoubleClick?: (point: IndoorPoint) => void;
  /** What was clicked on the building, or null for empty space. */
  onPick?: (picked: IndoorPick | null, event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Reports local units per pixel, so pixel tolerances convert correctly. */
  onScaleChange?: (unitsPerPixel: number) => void;
  /** Reports the zoom level for the status bar. */
  onZoomChange?: (zoom: number) => void;
  /**
   * The floor to frame from above. Changing this drops the camera onto that
   * floor, which is how you move between floors to draw on them.
   */
  frameOutline?: readonly IndoorPoint[] | null;
  className?: string;
}>;

export const IndoorMapSurface = forwardRef<
  IndoorMapSurfaceHandle,
  IndoorMapSurfaceProps
>(function IndoorMapSurface(
  {
    scene,
    draft = null,
    spaces,
    projection,
    centre,
    drawing,
    perspective,
    drawingAngle = 0,
    showGrid = false,
    palette = DEFAULT_INDOOR_PALETTE,
    hiddenLayers,
    onWorldPointerDown,
    onWorldPointerMove,
    onWorldPointerUp,
    onWorldDoubleClick,
    onPick,
    onKeyDown,
    onScaleChange,
    onZoomChange,
    frameOutline = null,
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const paletteRef = useRef(palette);
  const frameRef = useRef<(animate: boolean) => void>(() => {});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Handlers live in refs so the map is created once and never torn down.
  const handlersRef = useRef({
    onWorldPointerDown,
    onWorldPointerMove,
    onWorldPointerUp,
    onWorldDoubleClick,
    onPick,
    onKeyDown,
    onScaleChange,
    onZoomChange,
  });
  useEffect(() => {
    handlersRef.current = {
      onWorldPointerDown,
      onWorldPointerMove,
      onWorldPointerUp,
      onWorldDoubleClick,
      onPick,
      onKeyDown,
      onScaleChange,
      onZoomChange,
    };
  });

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      resetView: () => frameRef.current(true),
    }),
    [],
  );

  const toLocal = useCallback(
    (map: MapLibreMap, clientX: number, clientY: number) => {
      const rect = map.getContainer().getBoundingClientRect();
      const { lng, lat } = map.unproject([
        clientX - rect.left,
        clientY - rect.top,
      ]);
      return projectIndoorPoint(projection, lng, lat);
    },
    [projection],
  );
  const toLocalRef = useRef(toLocal);
  useEffect(() => {
    toLocalRef.current = toLocal;
  }, [toLocal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    void import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        setReady(false);
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: editorMapStyle(paletteRef.current),
          center: [centre[0], centre[1]],
          zoom: 18.5,
          pitch: PLAN_PITCH,
          bearing: 0,
          maxZoom: EDITOR_MAX_ZOOM,
          maxPitch: 70,
          renderWorldCopies: false,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
        });
        mapRef.current = map;

        map.on("load", () => {
          // The picker provides the campus context. Once a building is open,
          // this empty style keeps the canvas to its footprint and floors.
          addIndoorLayers(map, undefined, paletteRef.current);
          map.addLayer({
            id: "coursemap-selected-connector-outline",
            type: "line",
            source: INDOOR_SOURCE_IDS.connectors,
            filter: ["==", ["get", "highlight"], true],
            paint: {
              "line-color": paletteRef.current.labelText,
              "line-width": 3,
            },
          });
          map.addSource("coursemap-selected-connector", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "coursemap-selected-connector-marker",
            type: "circle",
            source: "coursemap-selected-connector",
            paint: {
              "circle-radius": 8,
              "circle-color": paletteRef.current.selection,
              "circle-stroke-color": paletteRef.current.labelText,
              "circle-stroke-width": 3,
            },
          });
          map.addLayer({
            id: "coursemap-selected-connector-label",
            type: "symbol",
            source: "coursemap-selected-connector",
            layout: {
              "text-field": ["concat", ["get", "name"], " · selected"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 13,
              "text-offset": [0, 1.6],
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": paletteRef.current.labelText,
              "text-halo-color": paletteRef.current.background,
              "text-halo-width": 2,
            },
          });
          map.addSource("coursemap-drawing-grid", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "coursemap-drawing-grid",
            type: "line",
            source: "coursemap-drawing-grid",
            paint: {
              "line-color": paletteRef.current.labelText,
              "line-width": ["case", ["get", "major"], 1, 0.5],
              "line-opacity": ["case", ["get", "major"], 0.3, 0.14],
            },
          });
          addIndoorDraftLayers(map, paletteRef.current);
          setReady(true);
        });

        map.on("click", (event) => {
          const pick = handlersRef.current.onPick;
          if (!pick) return;
          const layers = [
            "coursemap-illustrative-lift-cabins",
            "coursemap-illustrative-stairs",
            ...INDOOR_PICKABLE_LAYER_ID_LIST,
          ].filter((layerId) => map.getLayer(layerId));
          const features =
            layers.length > 0
              ? map.queryRenderedFeatures(event.point, { layers })
              : [];
          const feature =
            features.find(
              (feature) => typeof feature.properties?.connectorId === "string",
            ) ?? features[0];
          if (!feature) {
            pick(null, event.originalEvent);
            return;
          }
          const properties = feature.properties ?? {};
          if (typeof properties.openingId === "string") {
            pick(
              { kind: "opening", id: properties.openingId },
              event.originalEvent,
            );
          } else if (typeof properties.routeNodeId === "string") {
            pick(
              { kind: "route-node", id: properties.routeNodeId },
              event.originalEvent,
            );
          } else if (typeof properties.spaceId === "string") {
            pick(
              { kind: "space", id: properties.spaceId },
              event.originalEvent,
            );
          } else if (typeof properties.wallId === "string") {
            pick({ kind: "wall", id: properties.wallId }, event.originalEvent);
          } else if (typeof properties.connectorId === "string") {
            pick(
              { kind: "connector", id: properties.connectorId },
              event.originalEvent,
            );
          } else {
            pick(null, event.originalEvent);
          }
        });
        // MapLibre reports missing sprite images and the like as errors, so
        // failure is "never finished loading", not "raised an error". A map
        // this effect already tore down (React runs effects twice in
        // development) must not report itself as failed.
        let loaded = false;
        const timeout = window.setTimeout(() => {
          if (!cancelled && !loaded && !map.loaded()) setFailed(true);
        }, 12_000);
        map.once("load", () => {
          loaded = true;
          window.clearTimeout(timeout);
        });
        map.once("remove", () => window.clearTimeout(timeout));
      })
      .catch((error: unknown) => {
        console.error("The indoor map surface could not start.", error);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; the camera and data are driven by later effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    paletteRef.current = palette;
    const map = mapRef.current;
    if (!ready || !map) return;
    repaint(map, palette);
  }, [palette, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (!map.getSource("coursemap-selected-connector")) return;
    updateIndoorLayers(map, scene, hiddenLayers);
    const selected = hiddenLayers?.has("connectors")
      ? []
      : (scene?.connectors.features ?? []).filter(
          (feature) => feature.properties.highlight === true,
        );
    (
      map.getSource(
        "coursemap-selected-connector",
      ) as import("maplibre-gl").GeoJSONSource
    ).setData({
      type: "FeatureCollection",
      features: selected.flatMap((feature) => {
        if (feature.geometry.type !== "Polygon") return [];
        const points = feature.geometry.coordinates[0].slice(0, -1);
        return [
          {
            type: "Feature" as const,
            properties: feature.properties,
            geometry: {
              type: "Point" as const,
              coordinates: points.reduce<number[]>(
                ([x, y], point) => [
                  x + point[0] / points.length,
                  y + point[1] / points.length,
                ],
                [0, 0],
              ),
            },
          },
        ];
      }),
    });

    map.setLayoutProperty(
      "coursemap-selected-connector-outline",
      "visibility",
      hiddenLayers?.has("connectors") ? "none" : "visible",
    );
  }, [hiddenLayers, ready, scene]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource(INDOOR_DRAFT_SOURCE_ID) as
      import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData(
      draft
        ? buildIndoorDraftGeoJson(draft, projection, palette, spaces)
        : { type: "FeatureCollection", features: [] },
    );
  }, [draft, palette, projection, ready, spaces]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !ready ||
      !map ||
      !perspective ||
      hiddenLayers?.has("connectors") ||
      !scene?.connectors.features.some((feature) =>
        ["lift", "stairs"].includes(String(feature.properties.kind)),
      )
    )
      return;
    return animateLiftCabins(map, scene.connectors, palette);
  }, [hiddenLayers, palette, perspective, ready, scene]);

  // Drawing has to take the pointer away from the map, or every stroke pans it.
  // Plan view follows the drawing axes; free orbit belongs to 3D.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const interactions = [
      map.dragPan,
      map.doubleClickZoom,
      map.scrollZoom,
      map.touchZoomRotate,
    ] as const;
    for (const interaction of interactions) {
      if (drawing) interaction.disable();
      else interaction.enable();
    }
    // The wheel still zooms while drawing, so an author can zoom into a
    // corner mid-wall without switching tools.
    if (drawing) map.scrollZoom.enable();

    if (perspective && !drawing) {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enableRotation();
    } else {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      if (
        !perspective &&
        (map.getBearing() !== drawingAngle || map.getPitch() !== 0)
      ) {
        map.easeTo({ bearing: drawingAngle, pitch: PLAN_PITCH, duration: 200 });
      }
    }
  }, [drawing, drawingAngle, perspective, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    function report() {
      const container = map!.getContainer();
      const zoom = map!.getZoom();
      container.dataset.indoorZoom = zoom.toFixed(2);
      const centre = map!.getCenter();
      const pixel = map!.project(centre);
      const next = map!.unproject([pixel.x + 1, pixel.y]);
      const a = projectIndoorPoint(projection, centre.lng, centre.lat);
      const b = projectIndoorPoint(projection, next.lng, next.lat);
      handlersRef.current.onScaleChange?.(Math.hypot(b.x - a.x, b.y - a.y));
      handlersRef.current.onZoomChange?.(zoom);
    }

    report();
    map.on("move", report);
    return () => {
      map.off("move", report);
    };
  }, [projection, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !map.getSource("coursemap-drawing-grid")) return;
    function updateGrid() {
      const centre = map!.getCenter();
      const pixel = map!.project(centre);
      const next = map!.unproject([pixel.x + 1, pixel.y]);
      const a = projectIndoorPoint(projection, centre.lng, centre.lat);
      const b = projectIndoorPoint(projection, next.lng, next.lat);
      const scale = 1 / Math.hypot(b.x - a.x, b.y - a.y);
      (
        map!.getSource(
          "coursemap-drawing-grid",
        ) as import("maplibre-gl").GeoJSONSource
      ).setData(
        showGrid
          ? buildIndoorGrid(projection, drawingAngle, scale)
          : { type: "FeatureCollection", features: [] },
      );
      map!.setPaintProperty(
        "coursemap-drawing-grid",
        "line-color",
        palette.labelText,
      );
    }
    updateGrid();
    map.on("zoomend", updateGrid);
    return () => {
      map.off("zoomend", updateGrid);
    };
  }, [ready, projection, drawingAngle, showGrid, palette]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!ready || !map || !container) return;
    const canvas = map.getCanvas();

    function pointer(
      handler: "onWorldPointerDown" | "onWorldPointerMove" | "onWorldPointerUp",
    ) {
      return (event: PointerEvent) => {
        const callback = handlersRef.current[handler];
        if (!callback) return;
        callback(toLocalRef.current(map!, event.clientX, event.clientY), event);
      };
    }

    const onDown = pointer("onWorldPointerDown");
    const onMove = pointer("onWorldPointerMove");
    const onUp = pointer("onWorldPointerUp");
    function onDoubleClick(event: MouseEvent) {
      handlersRef.current.onWorldDoubleClick?.(
        toLocalRef.current(map!, event.clientX, event.clientY),
      );
    }
    function onKey(event: KeyboardEvent) {
      handlersRef.current.onKeyDown?.(event);
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("dblclick", onDoubleClick);
    container.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("dblclick", onDoubleClick);
      container.removeEventListener("keydown", onKey);
    };
  }, [ready]);

  /**
   * Frames the building and keeps it close. A one-level zoom-out allowance
   * gives useful context without letting metre-scale extrusions collapse into
   * sub-pixel artefacts against an empty world.
   */
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (
      !ready ||
      !map ||
      !container ||
      !frameOutline ||
      frameOutline.length === 0
    ) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const outline = frameOutline;

    function frame(animate: boolean) {
      const coordinates = outline.map((point) =>
        unprojectIndoorPoint(projection, point),
      );
      const bounds = coordinates.reduce(
        (current, [longitude, latitude]) => ({
          west: Math.min(current.west, longitude),
          south: Math.min(current.south, latitude),
          east: Math.max(current.east, longitude),
          north: Math.max(current.north, latitude),
        }),
        {
          west: coordinates[0][0],
          south: coordinates[0][1],
          east: coordinates[0][0],
          north: coordinates[0][1],
        },
      );
      const frameBounds: [
        [longitude: number, latitude: number],
        [longitude: number, latitude: number],
      ] = [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ];
      const pitch = perspective ? PERSPECTIVE_PITCH : PLAN_PITCH;

      // Clear the previous building's constraints before measuring this one.
      map!.setMaxBounds(null);
      map!.setMinZoom(null);
      map!.setMaxZoom(EDITOR_MAX_ZOOM);
      const camera = map!.cameraForBounds(frameBounds, {
        bearing: drawingAngle,
        maxZoom: EDITOR_MAX_ZOOM,
        padding: EDITOR_FRAME_PADDING,
        pitch,
      });
      if (!camera?.center || camera.zoom === undefined) return;

      const minimumZoom = Math.max(-2, camera.zoom - EDITOR_ZOOM_OUT_LEVELS);
      const longitudePadding =
        (bounds.east - bounds.west) * EDITOR_BOUNDS_PADDING;
      const latitudePadding =
        (bounds.north - bounds.south) * EDITOR_BOUNDS_PADDING;

      map!.setMinZoom(minimumZoom);
      map!.setMaxBounds([
        [bounds.west - longitudePadding, bounds.south - latitudePadding],
        [bounds.east + longitudePadding, bounds.north + latitudePadding],
      ]);
      container!.dataset.indoorFitZoom = camera.zoom.toFixed(2);
      container!.dataset.indoorMinZoom = minimumZoom.toFixed(2);
      container!.dataset.indoorMaxZoom = EDITOR_MAX_ZOOM.toFixed(2);
      map!.easeTo({
        bearing: drawingAngle,
        center: camera.center,
        duration: animate && !reduceMotion ? 400 : 0,
        pitch,
        zoom: camera.zoom,
      });
    }

    frameRef.current = frame;
    frame(true);
    let width = container.clientWidth;
    let height = container.clientHeight;
    const observer = new ResizeObserver(() => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      map.resize();
      frame(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [frameOutline, drawingAngle, perspective, projection, ready]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={containerRef}
        aria-label="Building floor plan editor"
        // MapLibre's own stylesheet forces position: relative on this element,
        // so it has to be sized rather than positioned.
        className={cn(
          "room-map h-full min-h-[20rem] w-full outline-none",
          drawing && "cursor-crosshair",
        )}
        role="application"
        tabIndex={0}
      />
      {failed ? (
        <Alert className="absolute inset-x-3 top-3" variant="destructive">
          <AlertDescription>
            The map could not be loaded, so this building cannot be edited right
            now.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
});
