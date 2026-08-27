"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MapPinOff } from "lucide-react";
import type {
  CampusMapCampus,
  CampusMapFeature,
  CampusMapLayer,
  CampusMapPlace,
  CampusMapPolygon,
  CampusWalkingRoute,
} from "@/lib/rooms/campus-map";

type CampusMapProps = {
  campus: CampusMapCampus | null;
  layers: readonly CampusMapLayer[];
  features: readonly CampusMapFeature[];
  places: readonly CampusMapPlace[];
  selectedSlug?: string;
  route: CampusWalkingRoute | null;
  routeEndpoints: Readonly<{
    from: CampusMapPlace;
    to: CampusMapPlace;
  }> | null;
  onSelect: (slug: string) => void;
};

type MapFeatureProperties = {
  id: string;
  name: string;
  featureKind: CampusMapFeature["featureKind"];
  placeSlug: string;
  colour: string;
  selected: boolean;
};

type CampusGeometry = CampusMapFeature["geometry"] | CampusMapPolygon;

const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_ROOM_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";

const MAP_ATTRIBUTION =
  'Walking routes: <a href="https://routing.openstreetmap.de/about.html">FOSSGIS</a>';

function campusMask(boundary: CampusMapPolygon): CampusMapPolygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [-180, -85],
        [180, -85],
        [180, 85],
        [-180, 85],
        [-180, -85],
      ],
      [...boundary.coordinates[0]].reverse(),
    ],
  };
}

function toGeoJsonGeometry(geometry: CampusGeometry): GeoJSON.Geometry {
  if (geometry.type === "LineString") {
    return {
      type: "LineString",
      coordinates: geometry.coordinates.map(([longitude, latitude]) => [
        longitude,
        latitude,
      ]),
    };
  }

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

function featureCollection(
  features: readonly CampusMapFeature[],
  layers: readonly CampusMapLayer[],
  places: readonly CampusMapPlace[],
  selectedSlug?: string,
): GeoJSON.FeatureCollection<GeoJSON.Geometry, MapFeatureProperties> {
  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  const placeById = new Map(places.map((place) => [place.id, place]));

  return {
    type: "FeatureCollection",
    features: features.map((feature) => {
      const place = feature.placeId ? placeById.get(feature.placeId) : null;
      return {
        type: "Feature",
        id: feature.id,
        geometry: toGeoJsonGeometry(feature.geometry),
        properties: {
          id: feature.id,
          name: feature.name,
          featureKind: feature.featureKind,
          placeSlug: place?.slug ?? "",
          colour: layerById.get(feature.layerId)?.colour ?? "#52525b",
          selected: place?.slug === selectedSlug,
        },
      };
    }),
  };
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

export function CampusMap({
  campus,
  layers,
  features,
  places,
  selectedSlug,
  route,
  routeEndpoints,
  onSelect,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapLibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const placeMarkersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const routeMarkersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const vectorFeatures = useMemo(
    () => featureCollection(features, layers, places, selectedSlug),
    [features, layers, places, selectedSlug],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
          bearing: 0,
          center: toLngLat(campus.initialCoordinates),
          container,
          dragRotate: false,
          keyboard: true,
          maxBounds: [
            [west, south],
            [east, north],
          ],
          maxPitch: 0,
          maxZoom: campus.maxZoom,
          minPitch: 0,
          minZoom: campus.minZoom,
          pitch: 0,
          renderWorldCopies: false,
          style: MAP_STYLE_URL,
          zoom: campus.initialZoom,
        });
        mapRef.current = map;
        mapLibreRef.current = maplibregl;

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
            showZoom: true,
            visualizePitch: false,
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

        loadTimeout = setTimeout(() => {
          if (!cancelled && !styleLoaded) setMapFailed(true);
        }, 12_000);

        map.once("style.load", () => {
          if (cancelled) return;
          styleLoaded = true;
          if (loadTimeout) clearTimeout(loadTimeout);

          map.addSource("campus-mask", {
            type: "geojson",
            data: toGeoJsonGeometry(campusMask(campus.boundary)),
          });
          map.addLayer({
            id: "campus-mask-fill",
            type: "fill",
            source: "campus-mask",
            paint: {
              "fill-color": "#f4f4f5",
              "fill-opacity": 0.96,
            },
          });

          map.addSource("campus-boundary", {
            type: "geojson",
            data: toGeoJsonGeometry(campus.boundary),
          });
          map.addLayer({
            id: "campus-boundary-line",
            type: "line",
            source: "campus-boundary",
            paint: {
              "line-color": "#7c3aed",
              "line-opacity": 0.7,
              "line-width": 2,
            },
          });

          map.addSource("campus-features", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "campus-walking-path-casing",
            type: "line",
            source: "campus-features",
            filter: ["==", ["get", "featureKind"], "walking_path"],
            paint: {
              "line-color": "#ffffff",
              "line-opacity": 0.95,
              "line-width": 8,
            },
          });
          map.addLayer({
            id: "campus-walking-path-line",
            type: "line",
            source: "campus-features",
            filter: ["==", ["get", "featureKind"], "walking_path"],
            paint: {
              "line-color": ["get", "colour"],
              "line-opacity": 0.95,
              "line-width": 4,
            },
          });
          map.addLayer({
            id: "campus-building-fill",
            type: "fill",
            source: "campus-features",
            filter: ["==", ["get", "featureKind"], "building"],
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["get", "selected"], false],
                "#7c3aed",
                ["get", "colour"],
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["get", "selected"], false],
                0.5,
                0.24,
              ],
            },
          });
          map.addLayer({
            id: "campus-building-outline",
            type: "line",
            source: "campus-features",
            filter: ["==", ["get", "featureKind"], "building"],
            paint: {
              "line-color": [
                "case",
                ["boolean", ["get", "selected"], false],
                "#6d28d9",
                ["get", "colour"],
              ],
              "line-opacity": 0.95,
              "line-width": [
                "case",
                ["boolean", ["get", "selected"], false],
                4,
                2,
              ],
            },
          });

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

          map.on("click", "campus-building-fill", (event) => {
            const placeSlug = event.features?.[0]?.properties?.placeSlug;
            if (typeof placeSlug === "string" && placeSlug) {
              onSelectRef.current(placeSlug);
            }
          });
          map.on("mouseenter", "campus-building-fill", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "campus-building-fill", () => {
            map.getCanvas().style.cursor = "";
          });

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
  }, [campus]);

  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current?.getSource("campus-features") as
      import("maplibre-gl").GeoJSONSource | null;
    void source?.setData(vectorFeatures);
  }, [mapReady, vectorFeatures]);

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

  return (
    <div className="room-map relative h-full min-h-[50dvh] overflow-hidden bg-zinc-100 lg:min-h-0">
      <div
        ref={containerRef}
        aria-label="Interactive vector map of the ANU Acton campus"
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

      {campus ? (
        <p className="pointer-events-none absolute bottom-7 left-3 z-10 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-sm backdrop-blur">
          ANU boundary · {features.length} mapped vectors
        </p>
      ) : null}
    </div>
  );
}
