"use client";

import { useEffect, useRef, useState } from "react";
import { Box, LoaderCircle, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  campusLayerControlsStyleLayer,
  getControlledStyleLayerVisibility,
  type CampusMapBuildingGeometry,
  type CampusMapCampus,
  type CampusMapFeature,
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
  features: readonly CampusMapFeature[];
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
const TERRAIN_HILLSHADE_SOURCE_ID = "coursemap-terrain-hillshade-source";
const TERRAIN_LAYER_ID = "coursemap-terrain-hillshade";

const MAP_ATTRIBUTION =
  'Walking routes: <a href="https://routing.openstreetmap.de/about.html">FOSSGIS</a>';

type BuildingHighlights = {
  selectedPlaceId: string | null;
  routeFromPlaceId: string | null;
  routeToPlaceId: string | null;
};

type StoredBuildingFeature = CampusMapFeature &
  Readonly<{
    featureKind: "building";
    geometry: CampusMapBuildingGeometry;
  }>;

const ANU_BUILDING_SOURCE_ID = "coursemap-anu-buildings";
const ANU_BUILDING_LAYER_ID = "coursemap-anu-buildings-3d";
const NATIVE_BUILDING_MAX_ZOOM = 24;

function isStoredBuildingFeature(
  feature: CampusMapFeature,
): feature is StoredBuildingFeature {
  return (
    feature.featureKind === "building" && feature.geometry.type !== "LineString"
  );
}

function toBuildingGeometry(
  geometry: CampusMapBuildingGeometry,
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        ring.map(([longitude, latitude]) => [longitude, latitude]),
      ),
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([longitude, latitude]) => [longitude, latitude]),
      ),
    ),
  };
}

function buildingHighlightKind(
  placeId: string | null,
  highlights: BuildingHighlights,
) {
  if (!placeId) return "default";
  if (placeId === highlights.routeToPlaceId) return "routeTo";
  if (placeId === highlights.routeFromPlaceId) return "routeFrom";
  if (placeId === highlights.selectedPlaceId) return "selected";
  return "default";
}

function buildAnuBuildingCollection(
  features: readonly CampusMapFeature[],
  places: readonly CampusMapPlace[],
  highlights: BuildingHighlights,
): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  const placeById = new Map(places.map((place) => [place.id, place]));

  return {
    type: "FeatureCollection",
    features: features.filter(isStoredBuildingFeature).map((feature) => {
      const place = feature.placeId ? placeById.get(feature.placeId) : null;
      const heightMetres = Number.isFinite(feature.heightMetres)
        ? Math.max(feature.heightMetres, 0)
        : 5;
      const minimumHeightMetres = Number.isFinite(feature.minimumHeightMetres)
        ? Math.min(Math.max(feature.minimumHeightMetres, 0), heightMetres)
        : 0;

      return {
        type: "Feature",
        id: feature.id,
        properties: {
          featureId: feature.id,
          heightMetres,
          highlight: buildingHighlightKind(feature.placeId, highlights),
          minimumHeightMetres,
          name: feature.name,
          placeId: feature.placeId ?? "",
          placeSlug: place?.slug ?? "",
          sourceIdentifier: feature.sourceIdentifier,
        },
        geometry: toBuildingGeometry(feature.geometry),
      };
    }),
  };
}

function syncAnuBuildings(
  map: import("maplibre-gl").Map,
  features: readonly CampusMapFeature[],
  places: readonly CampusMapPlace[],
  highlights: BuildingHighlights,
) {
  const source = map.getSource(ANU_BUILDING_SOURCE_ID) as
    import("maplibre-gl").GeoJSONSource | undefined;
  if (!source) return;

  void source.setData(buildAnuBuildingCollection(features, places, highlights));
}

function getLinkedBuildingSlugAtPoint(
  map: import("maplibre-gl").Map,
  point: import("maplibre-gl").PointLike,
) {
  return map
    .queryRenderedFeatures(point, { layers: [ANU_BUILDING_LAYER_ID] })
    .map((feature) => feature.properties?.placeSlug)
    .find((placeSlug): placeSlug is string =>
      Boolean(placeSlug && typeof placeSlug === "string"),
    );
}

function getBuildingFeaturesForPlace(
  features: readonly CampusMapFeature[],
  placeId: string | undefined,
) {
  if (!placeId) return [];
  return features
    .filter(isStoredBuildingFeature)
    .filter((feature) => feature.placeId === placeId);
}

function getBuildingBounds(
  features: readonly StoredBuildingFeature[],
): [[number, number], [number, number]] | null {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const feature of features) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [longitude, latitude] of ring) {
          west = Math.min(west, longitude);
          south = Math.min(south, latitude);
          east = Math.max(east, longitude);
          north = Math.max(north, latitude);
        }
      }
    }
  }

  return Number.isFinite(west)
    ? [
        [west, south],
        [east, north],
      ]
    : null;
}

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

function isNativeBuildingExtrusionLayer(
  styleLayer: Readonly<{ id: string; type: string }>,
) {
  return (
    styleLayer.id !== ANU_BUILDING_LAYER_ID &&
    styleLayer.type === "fill-extrusion"
  );
}

function applyStyleLayerVisibility(
  map: import("maplibre-gl").Map,
  layers: readonly CampusMapLayer[],
  visibleLayerSlugs: ReadonlySet<string>,
) {
  for (const styleLayer of map.getStyle().layers) {
    if (isNativeBuildingExtrusionLayer(styleLayer)) {
      map.setLayoutProperty(styleLayer.id, "visibility", "none");
      continue;
    }

    const visibility = getControlledStyleLayerVisibility(
      styleLayer.id,
      layers,
      visibleLayerSlugs,
    );
    if (visibility) {
      map.setLayoutProperty(styleLayer.id, "visibility", visibility);
    }
  }

  if (map.getLayer(ANU_BUILDING_LAYER_ID)) {
    map.setLayoutProperty(
      ANU_BUILDING_LAYER_ID,
      "visibility",
      visibleLayerSlugs.has("buildings") ? "visible" : "none",
    );
  }
}

export function CampusMap({
  campus,
  layers,
  visibleLayerSlugs,
  places,
  features,
  selectedSlug,
  route,
  routeEndpoints,
  onSelect,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapLibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const visibleLayerSlugsRef = useRef(visibleLayerSlugs);
  const placesRef = useRef(places);
  const featuresRef = useRef(features);
  const focusedPlaceSlugRef = useRef<string | null>(selectedSlug ?? null);
  const buildingHighlightsRef = useRef<BuildingHighlights>({
    selectedPlaceId: null,
    routeFromPlaceId: null,
    routeToPlaceId: null,
  });
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
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

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
          const buildingsLayer = layers.find(
            (layer) => layer.slug === "buildings",
          );
          const buildingStyleLayers = buildingsLayer
            ? styleLayers.filter((layer) =>
                campusLayerControlsStyleLayer(buildingsLayer, layer.id),
              )
            : [];

          for (const styleLayer of styleLayers) {
            if (isNativeBuildingExtrusionLayer(styleLayer)) {
              map.setLayoutProperty(styleLayer.id, "visibility", "none");
            }
          }

          for (const styleLayer of buildingStyleLayers) {
            if (styleLayer.type === "fill") {
              map.setLayerZoomRange(
                styleLayer.id,
                styleLayer.minzoom ?? 0,
                NATIVE_BUILDING_MAX_ZOOM,
              );
            } else if (styleLayer.type === "fill-extrusion") {
              map.setLayoutProperty(styleLayer.id, "visibility", "none");
            }
          }

          const lastBuildingIndex = Math.max(
            0,
            ...buildingStyleLayers.map((buildingLayer) =>
              styleLayers.findIndex((layer) => layer.id === buildingLayer.id),
            ),
          );
          const firstLabelLayer = styleLayers
            .slice(Math.max(0, lastBuildingIndex + 1))
            .find((layer) => layer.type === "symbol")?.id;

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

          map.addSource(ANU_BUILDING_SOURCE_ID, {
            type: "geojson",
            data: buildAnuBuildingCollection(
              featuresRef.current,
              placesRef.current,
              buildingHighlightsRef.current,
            ),
          });
          map.addLayer(
            {
              id: ANU_BUILDING_LAYER_ID,
              type: "fill-extrusion",
              source: ANU_BUILDING_SOURCE_ID,
              paint: {
                "fill-extrusion-base": ["get", "minimumHeightMetres"],
                "fill-extrusion-color": [
                  "match",
                  ["get", "highlight"],
                  "selected",
                  "#7c3aed",
                  "routeFrom",
                  "#7c3aed",
                  "routeTo",
                  "#059669",
                  "#a1a1aa",
                ],
                "fill-extrusion-height": ["get", "heightMetres"],
                "fill-extrusion-opacity": [
                  "match",
                  ["get", "highlight"],
                  "default",
                  0.72,
                  0.94,
                ],
                "fill-extrusion-vertical-gradient": true,
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

          map.on("click", (event) => {
            if (!visibleLayerSlugsRef.current.has("buildings")) return;
            const placeSlug = getLinkedBuildingSlugAtPoint(map, event.point);
            if (placeSlug) onSelectRef.current(placeSlug);
          });

          map.on("mousemove", (event) => {
            const placeSlug = visibleLayerSlugsRef.current.has("buildings")
              ? getLinkedBuildingSlugAtPoint(map, event.point)
              : null;
            map.getCanvas().style.cursor = placeSlug ? "pointer" : "";
          });
          map.on("mouseout", () => {
            map.getCanvas().style.cursor = "";
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
      buildingHighlightsRef.current = {
        selectedPlaceId: null,
        routeFromPlaceId: null,
        routeToPlaceId: null,
      };
      focusedPlaceSlugRef.current = null;
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
    if (!mapReady || !map) return;

    const selectedPlace = places.find((place) => place.slug === selectedSlug);
    if (
      selectedPlace?.mapDisplayKind !== "building" ||
      !visibleLayerSlugs.has("buildings")
    ) {
      buildingHighlightsRef.current.selectedPlaceId = null;
      syncAnuBuildings(map, features, places, buildingHighlightsRef.current);
      map.getContainer().dataset.selectedBuilding = "false";
      return;
    }

    const selectedFeatures = getBuildingFeaturesForPlace(
      features,
      selectedPlace.id,
    );
    buildingHighlightsRef.current.selectedPlaceId = selectedPlace.id;
    syncAnuBuildings(map, features, places, buildingHighlightsRef.current);

    const firstFeature = selectedFeatures[0];
    const container = map.getContainer();
    container.dataset.selectedBuilding = String(selectedFeatures.length > 0);
    container.dataset.selectedBuildingHeight = String(
      firstFeature?.heightMetres ?? "",
    );
    container.dataset.selectedBuildingName = firstFeature?.name ?? "";
    container.dataset.selectedBuildingId = selectedFeatures
      .map((feature) => feature.id)
      .join(",");
    container.dataset.selectedBuildingProperties = Object.keys(
      firstFeature?.sourceProperties ?? {},
    ).join(",");

    if (focusedPlaceSlugRef.current === selectedPlace.slug) return;
    const bounds = getBuildingBounds(selectedFeatures);
    if (!bounds) return;

    focusedPlaceSlugRef.current = selectedPlace.slug;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    map.fitBounds(bounds, {
      animate: !reduceMotion,
      duration: reduceMotion ? 0 : 450,
      maxZoom: Math.min(18.5, campus?.maxZoom ?? 18.5),
      padding: 72,
    });
  }, [
    campus?.maxZoom,
    features,
    mapReady,
    places,
    selectedSlug,
    visibleLayerSlugs,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const showBuildings = visibleLayerSlugs.has("buildings");
    buildingHighlightsRef.current.routeFromPlaceId =
      routeEndpoints && showBuildings ? routeEndpoints.from.id : null;
    buildingHighlightsRef.current.routeToPlaceId =
      routeEndpoints && showBuildings ? routeEndpoints.to.id : null;
    syncAnuBuildings(map, features, places, buildingHighlightsRef.current);
  }, [features, mapReady, places, routeEndpoints, visibleLayerSlugs]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = mapLibreRef.current;
    if (!mapReady || !map || !maplibregl) return;

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
