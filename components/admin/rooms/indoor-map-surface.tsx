"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addIndoorLayers,
  INDOOR_PICKABLE_LAYER_ID_LIST,
  updateIndoorLayers,
} from "@/components/rooms/indoor-3d-layers";
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

const EDITOR_MAP_STYLE: import("maplibre-gl").StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "coursemap-indoor-editor-background",
      type: "background",
      paint: { "background-color": "#f4f4f5" },
    },
  ],
};

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

function addIndoorDraftLayers(map: MapLibreMap) {
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
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }
}

export type IndoorMapSurfaceProps = Readonly<{
  scene: IndoorScene | null;
  /** The active authoring gesture, rendered separately from saved geometry. */
  draft?: IndoorDrag | null;
  projection: IndoorFootprintProjection;
  centre: readonly [longitude: number, latitude: number];
  /** True while a drawing tool is active, so the map does not pan under it. */
  drawing: boolean;
  perspective: boolean;
  onWorldPointerDown?: (point: IndoorPoint, event: PointerEvent) => void;
  onWorldPointerMove?: (point: IndoorPoint, event: PointerEvent) => void;
  onWorldPointerUp?: (point: IndoorPoint, event: PointerEvent) => void;
  onWorldDoubleClick?: (point: IndoorPoint) => void;
  /** What was clicked on the building, or null for empty space. */
  onPick?: (
    picked: Readonly<{
      kind: "space" | "wall" | "opening" | "connector" | "route-node";
      id: string;
    }> | null,
  ) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Reports metres per pixel, so pixel tolerances convert to local units. */
  onScaleChange?: (unitsPerPixel: number) => void;
  /**
   * The floor to frame from above. Changing this drops the camera onto that
   * floor, which is how you move between floors to draw on them.
   */
  frameOutline?: readonly IndoorPoint[] | null;
  className?: string;
}>;

export function IndoorMapSurface({
  scene,
  draft = null,
  projection,
  centre,
  drawing,
  perspective,
  onWorldPointerDown,
  onWorldPointerMove,
  onWorldPointerUp,
  onWorldDoubleClick,
  onPick,
  onKeyDown,
  onScaleChange,
  frameOutline = null,
  className,
}: IndoorMapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
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
    };
  });

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
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: EDITOR_MAP_STYLE,
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

        map.addControl(new maplibregl.NavigationControl({}), "top-right");
        map.on("load", () => {
          // The picker provides the campus context. Once a building is open,
          // this empty style keeps the canvas to its footprint and floors.
          addIndoorLayers(map);
          addIndoorDraftLayers(map);
          setReady(true);
        });

        map.on("click", (event) => {
          const pick = handlersRef.current.onPick;
          if (!pick) return;
          const layers = INDOOR_PICKABLE_LAYER_ID_LIST.filter((layerId) =>
            map.getLayer(layerId),
          );
          const [feature] =
            layers.length > 0
              ? map.queryRenderedFeatures(event.point, { layers })
              : [];
          if (!feature) {
            pick(null);
            return;
          }
          const properties = feature.properties ?? {};
          if (typeof properties.openingId === "string") {
            pick({ kind: "opening", id: properties.openingId });
          } else if (typeof properties.routeNodeId === "string") {
            pick({ kind: "route-node", id: properties.routeNodeId });
          } else if (typeof properties.spaceId === "string") {
            pick({ kind: "space", id: properties.spaceId });
          } else if (typeof properties.wallId === "string") {
            pick({ kind: "wall", id: properties.wallId });
          } else if (typeof properties.connectorId === "string") {
            pick({ kind: "connector", id: properties.connectorId });
          } else {
            pick(null);
          }
        });
        // MapLibre reports missing sprite images and the like as errors, so
        // failure is "never finished loading", not "raised an error".
        const timeout = window.setTimeout(() => {
          if (!map.loaded()) setFailed(true);
        }, 12_000);
        map.once("load", () => window.clearTimeout(timeout));
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; the camera and data are driven by later effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    updateIndoorLayers(map, scene);
  }, [ready, scene]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource(INDOOR_DRAFT_SOURCE_ID) as
      import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData(
      draft
        ? buildIndoorDraftGeoJson(draft, projection)
        : { type: "FeatureCollection", features: [] },
    );
  }, [draft, projection, ready]);

  // Drawing has to take the pointer away from the map, or every stroke pans it.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const interactions = [
      map.dragPan,
      map.dragRotate,
      map.doubleClickZoom,
      map.scrollZoom,
      map.touchZoomRotate,
    ] as const;
    for (const interaction of interactions) {
      if (drawing) interaction.disable();
      else interaction.enable();
    }
  }, [drawing, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    function report() {
      const bounds = map!.getBounds();
      const container = map!.getContainer();
      const width = container.clientWidth || 1;
      container.dataset.indoorZoom = map!.getZoom().toFixed(2);
      const west = projectIndoorPoint(
        projection,
        bounds.getWest(),
        bounds.getSouth(),
      );
      const east = projectIndoorPoint(
        projection,
        bounds.getEast(),
        bounds.getSouth(),
      );
      handlersRef.current.onScaleChange?.(Math.abs(east.x - west.x) / width);
    }

    report();
    map.on("move", report);
    return () => {
      map.off("move", report);
    };
  }, [projection, ready]);

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
        bearing: 0,
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
        bearing: 0,
        center: camera.center,
        duration: animate && !reduceMotion ? 400 : 0,
        pitch,
        zoom: camera.zoom,
      });
    }

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
  }, [frameOutline, perspective, projection, ready]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-zinc-200 bg-zinc-100",
        className,
      )}
    >
      <div
        ref={containerRef}
        aria-label="Building floor plan editor"
        // MapLibre's own stylesheet forces position: relative on this element,
        // so it has to be sized rather than positioned.
        className={cn(
          "room-map h-full min-h-[28rem] w-full outline-none",
          drawing && "cursor-crosshair",
        )}
        role="application"
        tabIndex={0}
      />
      {failed ? (
        <p className="absolute inset-x-3 top-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          The map could not be loaded, so this building cannot be edited right
          now.
        </p>
      ) : null}
    </div>
  );
}
