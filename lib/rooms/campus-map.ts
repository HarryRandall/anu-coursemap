export type CampusMapLayer = Readonly<{
  id: string;
  campusId: string;
  slug: string;
  name: string;
  description: string | null;
  colour: string;
  isVisibleByDefault: boolean;
  sortOrder: number;
}>;

export type CampusMapPolygon = Readonly<{
  type: "Polygon";
  coordinates: readonly (readonly (readonly [number, number])[])[];
}>;

export type CampusMapLineString = Readonly<{
  type: "LineString";
  coordinates: readonly (readonly [number, number])[];
}>;

export type CampusMapCampus = Readonly<{
  id: string;
  slug: string;
  name: string;
  boundary: CampusMapPolygon;
  bounds: readonly [west: number, south: number, east: number, north: number];
  initialCoordinates: readonly [longitude: number, latitude: number];
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  sourceIdentifier: string;
  sourceUrl: string;
  sourceLicense: string;
}>;

export type CampusMapFeature = Readonly<{
  id: string;
  campusId: string;
  layerId: string;
  placeId: string | null;
  slug: string;
  name: string;
  featureKind: "building" | "walking_path";
  geometry: CampusMapPolygon | CampusMapLineString;
  sourceIdentifier: string;
  sourceUrl: string;
  sourceLicense: string;
  sortOrder: number;
}>;

export type CampusMapPlaceDetail = Readonly<{
  id: string;
  kind: string;
  label: string;
  sortOrder: number;
}>;

export type CampusMapPlace = Readonly<{
  id: string;
  layerId: string;
  slug: string;
  name: string;
  markerLabel: string;
  address: string;
  coordinates: readonly [longitude: number, latitude: number];
  officialUrl: string | null;
  dataStatus: "example" | "verified";
  isRoutable: boolean;
  sortOrder: number;
  details: readonly CampusMapPlaceDetail[];
}>;

export type CampusMapData = Readonly<{
  campus: CampusMapCampus | null;
  layers: readonly CampusMapLayer[];
  places: readonly CampusMapPlace[];
  features: readonly CampusMapFeature[];
}>;

export type CampusWalkingRoute = Readonly<{
  coordinates: readonly (readonly [longitude: number, latitude: number])[];
  distanceMetres: number;
  durationSeconds: number;
}>;

function isCoordinate(value: unknown): value is readonly [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => Number.isFinite(part))
  );
}

export function isCampusMapLineString(
  value: unknown,
): value is CampusMapLineString {
  if (!value || typeof value !== "object") return false;
  const coordinates = Reflect.get(value, "coordinates");
  return (
    Reflect.get(value, "type") === "LineString" &&
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    coordinates.every(isCoordinate)
  );
}

export function isCampusMapPolygon(value: unknown): value is CampusMapPolygon {
  if (!value || typeof value !== "object") return false;
  const coordinates = Reflect.get(value, "coordinates");
  return (
    Reflect.get(value, "type") === "Polygon" &&
    Array.isArray(coordinates) &&
    coordinates.length > 0 &&
    coordinates.every(
      (ring) =>
        Array.isArray(ring) && ring.length >= 4 && ring.every(isCoordinate),
    )
  );
}

export function isCampusWalkingRoute(
  value: unknown,
): value is CampusWalkingRoute {
  if (!value || typeof value !== "object") return false;
  const coordinates = Reflect.get(value, "coordinates");
  const distanceMetres = Reflect.get(value, "distanceMetres");
  const durationSeconds = Reflect.get(value, "durationSeconds");

  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    coordinates.every(isCoordinate) &&
    Number.isFinite(distanceMetres) &&
    Number.isFinite(durationSeconds)
  );
}

export function findCampusPlace(
  places: readonly CampusMapPlace[],
  slug: string | undefined,
) {
  return places.find((place) => place.slug === slug);
}

export function filterCampusPlaces(
  places: readonly CampusMapPlace[],
  layers: readonly CampusMapLayer[],
  visibleLayerSlugs: ReadonlySet<string>,
  query: string,
) {
  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  const terms = query
    .trim()
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean);

  return places.filter((place) => {
    const layer = layerById.get(place.layerId);
    if (!layer || !visibleLayerSlugs.has(layer.slug)) return false;
    if (terms.length === 0) return true;

    const searchable = [
      place.name,
      place.address,
      layer.name,
      ...place.details.map((detail) => detail.label),
    ]
      .join(" ")
      .toLocaleLowerCase("en-AU");

    return terms.every((term) => searchable.includes(term));
  });
}

export function getDefaultVisibleLayerSlugs(layers: readonly CampusMapLayer[]) {
  return new Set(
    layers
      .filter((layer) => layer.isVisibleByDefault)
      .map((layer) => layer.slug),
  );
}

export function formatWalkingDistance(distanceMetres: number) {
  if (distanceMetres < 1000) return `${Math.round(distanceMetres)} m`;
  return `${(distanceMetres / 1000).toFixed(1)} km`;
}

export function formatWalkingDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min walk`;
}
