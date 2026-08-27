"use client";

import { useEffect, useRef, useState } from "react";
import { Box, LoaderCircle, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getControlledStyleLayerVisibility,
  type CampusMapCampus,
  type CampusMapLayer,
  type CampusMapPlace,
  type CampusMapPolygon,
  type CampusWalkingRoute,
} from "@/lib/rooms/campus-map";

type CampusMapProps = {
  campus: CampusMapCampus | null;
  layers: readonly CampusMapLayer[];
  visibleLayerSlugs: ReadonlySet<string>;
  places: readonly CampusMapPlace[];
  selectedSlug?: string;
  route: CampusWalkingRoute | null;
  routeEndpoints: Readonly<{
    from: CampusMapPlace;
    to: CampusMapPlace;
  }> | null;
  onSelect: (slug: string) => void;
};

const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_ROOM_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";
const TERRAIN_URL =
  process.env.NEXT_PUBLIC_ROOM_MAP_TERRAIN_URL ??
  "https://tiles.mapterhorn.com/tilejson.json";
const TERRAIN_SOURCE_ID = "coursemap-terrain";
const TERRAIN_HILLSHADE_SOURCE_ID = "coursemap-terrain-hillshade-source";
const TERRAIN_LAYER_ID = "coursemap-terrain-hillshade";

const MAP_ATTRIBUTION =
  'Walking routes: <a href="https://routing.openstreetmap.de/about.html">FOSSGIS</a>';

function toGeoJsonGeometry(geometry: CampusMapPolygon): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: geometry.coordinates.map((ring) =>
      ring.map(([longitude, latitude]) => [longitude, latitude]),
    ),
  };
}

function toLngLat(
  coordinate: readonly [longitude: number, latitude: number],
): [number, number] {
  return [coordinate[0], coordinate[1]];
}

function createPlaceMarker(
  place: CampusMapPlace,
  colour: string,
  isSelected: boolean,
  onSelect: (slug: string) => void,
) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "room-map-marker";
  element.dataset.roomMapSlug = place.slug;
  element.dataset.selected = String(isSelected);
  element.textContent = place.markerLabel;
  element.style.setProperty("--room-map-marker-colour", colour);
  element.setAttribute("aria-label", `Select ${place.name}`);
  element.setAttribute("aria-pressed", String(isSelected));
  element.addEventListener("click", () => onSelect(place.slug));
  return element;
}

function createEndpointMarker(label: "A" | "B") {
  const element = document.createElement("span");
  element.className = "room-route-endpoint";
  element.textContent = label;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function applyStyleLayerVisibility(
  map: import("maplibre-gl").Map,
  layers: readonly CampusMapLayer[],
  visibleLayerSlugs: ReadonlySet<string>,
) {
  for (const styleLayer of map.getStyle().layers) {
    const visibility = getControlledStyleLayerVisibility(
      styleLayer.id,
      layers,
      visibleLayerSlugs,
    );
    if (visibility) {
      map.setLayoutProperty(styleLayer.id, "visibility", visibility);
    }
  }

  map.setTerrain(
    visibleLayerSlugs.has("terrain")
      ? { source: TERRAIN_SOURCE_ID, exaggeration: 1 }
      : null,
  );
}

export function CampusMap({
  campus,
  layers,
  visibleLayerSlugs,
  places,
  selectedSlug,
  route,
  routeEndpoints,
  onSelect,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapLibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const visibleLayerSlugsRef = useRef(visibleLayerSlugs);
  const placeMarkersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const routeMarkersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [isPerspective, setIsPerspective] = useState(true);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    visibleLayerSlugsRef.current = visibleLayerSlugs;
  }, [visibleLayerSlugs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !campus) return;

    let cancelled = false;
    let styleLoaded = false;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;
    setMapFailed(false);
    setMapReady(false);

    void import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled) return;

        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

        const [west, south, east, north] = campus.bounds;
        const map = new maplibregl.Map({
          attributionControl: false,
          bearing: -12,
          canvasContextAttributes: { antialias: true },
          center: toLngLat(campus.initialCoordinates),
          container,
          dragRotate: true,
          keyboard: true,
          maxBounds: [
            [west, south],
            [east, north],
          ],
          maxPitch: 65,
          maxZoom: campus.maxZoom,
          minPitch: 0,
          minZoom: campus.minZoom,
          pitch: 35,
          renderWorldCopies: false,
          style: MAP_STYLE_URL,
          zoom: campus.initialZoom,
        });
        mapRef.current = map;
        mapLibreRef.current = maplibregl;

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }),
          "top-right",
        );
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: MAP_ATTRIBUTION,
          }),
          "bottom-right",
        );

        const updateCameraMetadata = () => {
          const centre = map.getCenter();
          container.dataset.mapBearing = map.getBearing().toFixed(2);
          container.dataset.mapCentre = `${centre.lng.toFixed(6)},${centre.lat.toFixed(6)}`;
          container.dataset.mapPitch = map.getPitch().toFixed(2);
          container.dataset.mapZoom = map.getZoom().toFixed(2);
        };
        const updatePerspective = () => {
          setIsPerspective(map.getPitch() > 10);
          updateCameraMetadata();
        };
        updateCameraMetadata();
        map.on("moveend", updateCameraMetadata);
        map.on("pitch", updatePerspective);

        loadTimeout = setTimeout(() => {
          if (!cancelled && !styleLoaded) setMapFailed(true);
        }, 12_000);

        map.once("style.load", () => {
          if (cancelled) return;
          styleLoaded = true;
          if (loadTimeout) clearTimeout(loadTimeout);

          const styleLayers = map.getStyle().layers;
          const firstTransportLayer = styleLayers.find((layer) =>
            /^(tunnel_|road_|bridge_|building)/.test(layer.id),
          )?.id;
          const firstLabelLayer = styleLayers.find(
            (layer) => layer.type === "symbol",
          )?.id;

          map.addSource(TERRAIN_SOURCE_ID, {
            type: "raster-dem",
            url: TERRAIN_URL,
            tileSize: 512,
            attribution:
              '<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>',
          });
          map.addSource(TERRAIN_HILLSHADE_SOURCE_ID, {
            type: "raster-dem",
            url: TERRAIN_URL,
            tileSize: 512,
            attribution: "",
          });
          map.addLayer(
            {
              id: TERRAIN_LAYER_ID,
              type: "hillshade",
              source: TERRAIN_HILLSHADE_SOURCE_ID,
              paint: {
                "hillshade-accent-color": "#675f4d",
                "hillshade-exaggeration": 0.28,
                "hillshade-highlight-color": "#fffdf7",
                "hillshade-shadow-color": "#473b24",
              },
            },
            firstTransportLayer,
          );

          map.addSource("campus-boundary", {
            type: "geojson",
            data: toGeoJsonGeometry(campus.boundary),
          });
          map.addLayer(
            {
              id: "campus-boundary-line",
              type: "line",
              source: "campus-boundary",
              paint: {
                "line-color": "#7c3aed",
                "line-dasharray": [2, 2],
                "line-opacity": 0.65,
                "line-width": 2,
              },
            },
            firstLabelLayer,
          );

          map.addSource("campus-route", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "campus-route-casing",
            type: "line",
            source: "campus-route",
            paint: {
              "line-color": "#ffffff",
              "line-opacity": 0.95,
              "line-width": 10,
            },
          });
          map.addLayer({
            id: "campus-route-line",
            type: "line",
            source: "campus-route",
            paint: {
              "line-color": "#7c3aed",
              "line-opacity": 0.98,
              "line-width": 6,
            },
          });

          applyStyleLayerVisibility(map, layers, visibleLayerSlugsRef.current);
          setMapReady(true);
          setMapFailed(false);
        });

        map.on("error", (event) => {
          if (!cancelled && !styleLoaded && event.error) setMapFailed(true);
        });
      })
      .catch(() => {
        if (!cancelled) setMapFailed(true);
      });

    return () => {
      cancelled = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      placeMarkersRef.current.forEach((marker) => marker.remove());
      routeMarkersRef.current.forEach((marker) => marker.remove());
      placeMarkersRef.current = [];
      routeMarkersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapLibreRef.current = null;
    };
  }, [campus, layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    applyStyleLayerVisibility(map, layers, visibleLayerSlugs);
  }, [layers, mapReady, visibleLayerSlugs]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = mapLibreRef.current;
    if (!mapReady || !map || !maplibregl) return;

    placeMarkersRef.current.forEach((marker) => marker.remove());
    const layerById = new Map(layers.map((layer) => [layer.id, layer]));
    placeMarkersRef.current = places.map((place) => {
      const marker = new maplibregl.Marker({
        anchor: "center",
        element: createPlaceMarker(
          place,
          layerById.get(place.layerId)?.colour ?? "#52525b",
          place.slug === selectedSlug,
          (slug) => onSelectRef.current(slug),
        ),
      })
        .setLngLat(toLngLat(place.coordinates))
        .addTo(map);
      return marker;
    });

    return () => {
      placeMarkersRef.current.forEach((marker) => marker.remove());
      placeMarkersRef.current = [];
    };
  }, [layers, mapReady, places, selectedSlug]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = mapLibreRef.current;
    if (!mapReady || !map || !maplibregl) return;

    routeMarkersRef.current.forEach((marker) => marker.remove());
    routeMarkersRef.current = [];
    const source = map.getSource("campus-route") as
      import("maplibre-gl").GeoJSONSource | null;

    if (!route || !routeEndpoints) {
      void source?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    void source?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route.coordinates.map(toLngLat),
      },
    });

    routeMarkersRef.current = [
      new maplibregl.Marker({
        anchor: "center",
        element: createEndpointMarker("A"),
      })
        .setLngLat(toLngLat(routeEndpoints.from.coordinates))
        .addTo(map),
      new maplibregl.Marker({
        anchor: "center",
        element: createEndpointMarker("B"),
      })
        .setLngLat(toLngLat(routeEndpoints.to.coordinates))
        .addTo(map),
    ];

    const bounds = route.coordinates.reduce(
      (result, coordinate) => result.extend(toLngLat(coordinate)),
      new maplibregl.LngLatBounds(
        toLngLat(route.coordinates[0]),
        toLngLat(route.coordinates[0]),
      ),
    );
    map.fitBounds(bounds, {
      animate: false,
      maxZoom: Math.min(17, campus?.maxZoom ?? 17),
      padding: 64,
    });

    return () => {
      routeMarkersRef.current.forEach((marker) => marker.remove());
      routeMarkersRef.current = [];
    };
  }, [campus?.maxZoom, mapReady, route, routeEndpoints]);

  function togglePerspective() {
    const map = mapRef.current;
    if (!map) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    map.easeTo({
      bearing: isPerspective ? 0 : -18,
      duration: reduceMotion ? 0 : 550,
      pitch: isPerspective ? 0 : 52,
    });
  }

  return (
    <div className="room-map relative h-full min-h-[50dvh] overflow-hidden bg-zinc-100 lg:min-h-0">
      <div
        ref={containerRef}
        aria-label="Interactive vector map of ANU and central Canberra"
        className="h-full w-full"
      />

      {campus && !mapReady && !mapFailed ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-zinc-100/90 text-sm text-zinc-600">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={16}
            />
            Loading ANU vector map...
          </span>
        </div>
      ) : null}

      {!campus ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-zinc-100 text-sm text-zinc-600">
          <p className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <MapPinOff aria-hidden="true" size={15} />
            Campus map data is unavailable.
          </p>
        </div>
      ) : null}

      {mapFailed ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-center">
          <p className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm">
            <MapPinOff aria-hidden="true" size={15} />
            The vector map could not be loaded.
          </p>
        </div>
      ) : null}

      {campus && mapReady ? (
        <div className="absolute bottom-8 left-3 z-10 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            aria-pressed={isPerspective}
            onClick={togglePerspective}
          >
            <Box aria-hidden="true" size={14} />
            {isPerspective ? "2D view" : "3D view"}
          </Button>
          <p className="pointer-events-none hidden rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-sm backdrop-blur sm:block">
            Drag to pan · right-drag to rotate
          </p>
        </div>
      ) : null}
    </div>
  );
}
