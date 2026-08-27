"use client";

import { useEffect, useRef, useState } from "react";
import { Box, LoaderCircle, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  campusLayerControlsStyleLayer,
  getControlledStyleLayerVisibility,
  isCoordinateInBuildingGeometry,
  isCoordinateNearBuildingGeometry,
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
const TERRAIN_HILLSHADE_SOURCE_ID = "coursemap-terrain-hillshade-source";
const TERRAIN_LAYER_ID = "coursemap-terrain-hillshade";

const MAP_ATTRIBUTION =
  'Walking routes: <a href="https://routing.openstreetmap.de/about.html">FOSSGIS</a>';

type BuildingGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;
type BuildingSelection = Readonly<{
  id: string | number;
  source: string;
  sourceLayer: string;
  geometry: BuildingGeometry;
  properties: GeoJSON.GeoJsonProperties;
}>;
type BuildingHighlights = {
  selected: BuildingSelection | null;
  routeFrom: BuildingSelection | null;
  routeTo: BuildingSelection | null;
};

const BUILDING_HIGHLIGHT_SOURCE_ID = "campus-building-highlights";
const BUILDING_HIGHLIGHT_LAYER_ID = "campus-building-highlight";

function syncBuildingHighlights(
  map: import("maplibre-gl").Map,
  highlights: BuildingHighlights,
) {
  const source = map.getSource(BUILDING_HIGHLIGHT_SOURCE_ID) as
    import("maplibre-gl").GeoJSONSource | undefined;
  if (!source) return;

  const featuresByBuilding = new Map<
    string,
    GeoJSON.Feature<BuildingGeometry>
  >();
  const selections = [
    { colour: "#7c3aed", kind: "selected", selection: highlights.selected },
    { colour: "#7c3aed", kind: "routeFrom", selection: highlights.routeFrom },
    { colour: "#059669", kind: "routeTo", selection: highlights.routeTo },
  ] as const;

  for (const { colour, kind, selection } of selections) {
    if (!selection) continue;
    const renderHeight = Number(selection.properties?.render_height);
    const nativeHeight =
      Number.isFinite(renderHeight) && renderHeight > 0 ? renderHeight : 0;
    featuresByBuilding.set(
      `${selection.source}:${selection.sourceLayer}:${selection.id}`,
      {
        type: "Feature",
        properties: {
          colour,
          height: nativeHeight + 0.45,
          kind,
          minHeight: nativeHeight + 0.05,
        },
        geometry: selection.geometry,
      },
    );
  }

  void source.setData({
    type: "FeatureCollection",
    features: [...featuresByBuilding.values()],
  });
}

function isBuildingGeometry(
  geometry: GeoJSON.Geometry,
): geometry is BuildingGeometry {
  return geometry.type === "Polygon" || geometry.type === "MultiPolygon";
}

function asBuildingSelection(
  feature: import("maplibre-gl").MapGeoJSONFeature | undefined,
): BuildingSelection | null {
  if (
    !feature ||
    feature.id === undefined ||
    !feature.sourceLayer ||
    !isBuildingGeometry(feature.geometry)
  ) {
    return null;
  }
  return {
    id: feature.id,
    source: feature.source,
    sourceLayer: feature.sourceLayer,
    properties: feature.properties,
    geometry: feature.geometry,
  };
}

function setSelectedBuilding(
  map: import("maplibre-gl").Map,
  selection: BuildingSelection | null,
  highlights: BuildingHighlights,
) {
  highlights.selected = selection;
  syncBuildingHighlights(map, highlights);

  map.getContainer().dataset.selectedBuilding = String(Boolean(selection));
  map.getContainer().dataset.selectedBuildingHeight = String(
    selection?.properties?.render_height ?? "",
  );
  map.getContainer().dataset.selectedBuildingName = String(
    selection?.properties?.name ?? "",
  );
  map.getContainer().dataset.selectedBuildingId = String(selection?.id ?? "");
  map.getContainer().dataset.selectedBuildingProperties = Object.keys(
    selection?.properties ?? {},
  ).join(",");
}

function getBuildingFeatureAtPoint(
  map: import("maplibre-gl").Map,
  point:
    | import("maplibre-gl").PointLike
    | [import("maplibre-gl").PointLike, import("maplibre-gl").PointLike],
  buildingLayerIds: readonly string[],
  coordinate: readonly [number, number],
) {
  if (buildingLayerIds.length === 0) return null;
  const features = map.queryRenderedFeatures(point, {
    layers: [...buildingLayerIds],
  });
  const buildingFeatures = features
    .map(asBuildingSelection)
    .filter((feature): feature is BuildingSelection => feature !== null);

  const buildingPolygons = buildingFeatures.flatMap((feature) => {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry]
        : feature.geometry.coordinates.map((coordinates): GeoJSON.Polygon => ({
            type: "Polygon",
            coordinates,
          }));
    return polygons.map((geometry) => ({ ...feature, geometry }));
  });

  return (
    buildingPolygons.find((feature) =>
      isCoordinateInBuildingGeometry(coordinate, feature.geometry),
    ) ??
    buildingPolygons.find((feature) =>
      isCoordinateNearBuildingGeometry(coordinate, feature.geometry),
    ) ??
    null
  );
}

function getBuildingFeatureAtCoordinate(
  map: import("maplibre-gl").Map,
  coordinate: readonly [number, number],
  buildingLayerIds: readonly string[],
) {
  const point = map.project(toLngLat(coordinate));
  return getBuildingFeatureAtPoint(
    map,
    [
      [point.x - 18, point.y - 18],
      [point.x + 18, point.y + 18],
    ],
    buildingLayerIds,
    coordinate,
  );
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
  const placesRef = useRef(places);
  const buildingLayerIdsRef = useRef<string[]>([]);
  const buildingHighlightsRef = useRef<BuildingHighlights>({
    selected: null,
    routeFrom: null,
    routeTo: null,
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
          const buildingLayerIds = buildingsLayer
            ? styleLayers
                .filter((layer) =>
                  campusLayerControlsStyleLayer(buildingsLayer, layer.id),
                )
                .map((layer) => layer.id)
            : [];
          buildingLayerIdsRef.current = buildingLayerIds;
          const lastBuildingIndex = Math.max(
            ...buildingLayerIds.map((id) =>
              styleLayers.findIndex((layer) => layer.id === id),
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

          map.addSource(BUILDING_HIGHLIGHT_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer(
            {
              id: BUILDING_HIGHLIGHT_LAYER_ID,
              type: "fill-extrusion",
              source: BUILDING_HIGHLIGHT_SOURCE_ID,
              paint: {
                "fill-extrusion-base": ["get", "minHeight"],
                "fill-extrusion-color": ["get", "colour"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 0.92,
                "fill-extrusion-vertical-gradient": false,
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
            if (
              !visibleLayerSlugsRef.current.has("buildings") ||
              !isCoordinateInBuildingGeometry(
                [event.lngLat.lng, event.lngLat.lat],
                toGeoJsonGeometry(campus.boundary),
              )
            ) {
              return;
            }

            const feature = getBuildingFeatureAtPoint(
              map,
              event.point,
              buildingLayerIdsRef.current,
              [event.lngLat.lng, event.lngLat.lat],
            );
            if (!feature) return;
            setSelectedBuilding(map, feature, buildingHighlightsRef.current);

            const mappedPlace = placesRef.current.find(
              (place) =>
                place.mapDisplayKind === "building" &&
                isCoordinateNearBuildingGeometry(
                  place.coordinates,
                  feature.geometry,
                ),
            );
            if (mappedPlace) onSelectRef.current(mappedPlace.slug);
          });

          map.on("mousemove", (event) => {
            const isInsideCampus = isCoordinateInBuildingGeometry(
              [event.lngLat.lng, event.lngLat.lat],
              toGeoJsonGeometry(campus.boundary),
            );
            const feature =
              visibleLayerSlugsRef.current.has("buildings") && isInsideCampus
                ? getBuildingFeatureAtPoint(
                    map,
                    event.point,
                    buildingLayerIdsRef.current,
                    [event.lngLat.lng, event.lngLat.lat],
                  )
                : null;
            map.getCanvas().style.cursor = feature ? "pointer" : "";
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
      buildingLayerIdsRef.current = [];
      buildingHighlightsRef.current = {
        selected: null,
        routeFrom: null,
        routeTo: null,
      };
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
      setSelectedBuilding(map, null, buildingHighlightsRef.current);
      return;
    }

    const selectBuildingFootprint = () => {
      const feature = getBuildingFeatureAtCoordinate(
        map,
        selectedPlace.coordinates,
        buildingLayerIdsRef.current,
      );
      setSelectedBuilding(map, feature, buildingHighlightsRef.current);
    };

    selectBuildingFootprint();
    map.once("idle", selectBuildingFootprint);
    return () => {
      map.off("idle", selectBuildingFootprint);
    };
  }, [mapReady, places, selectedSlug, visibleLayerSlugs]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const highlightRouteBuildings = () => {
      const showBuildings = visibleLayerSlugs.has("buildings");
      const fromFeature =
        routeEndpoints && showBuildings
          ? getBuildingFeatureAtCoordinate(
              map,
              routeEndpoints.from.coordinates,
              buildingLayerIdsRef.current,
            )
          : null;
      const toFeature =
        routeEndpoints && showBuildings
          ? getBuildingFeatureAtCoordinate(
              map,
              routeEndpoints.to.coordinates,
              buildingLayerIdsRef.current,
            )
          : null;

      buildingHighlightsRef.current.routeFrom = fromFeature;
      buildingHighlightsRef.current.routeTo = toFeature;
      syncBuildingHighlights(map, buildingHighlightsRef.current);
    };

    highlightRouteBuildings();
    map.once("idle", highlightRouteBuildings);
    return () => {
      map.off("idle", highlightRouteBuildings);
    };
  }, [mapReady, routeEndpoints, visibleLayerSlugs]);

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
