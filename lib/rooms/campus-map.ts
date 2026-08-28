import type { CampusIndoorDocument } from "@/lib/rooms/indoor-map";

export type CampusMapLayer = Readonly<{
  id: string;
  campusId: string;
  slug: string;
  name: string;
  description: string | null;
  colour: string;
  isVisibleByDefault: boolean;
  layerKind: "map" | "place" | "hybrid";
  styleLayerPatterns: readonly string[];
  sortOrder: number;
}>;

export type CampusMapPolygon = Readonly<{
  type: "Polygon";
  coordinates: readonly (readonly (readonly [number, number])[])[];
}>;

export type CampusMapMultiPolygon = Readonly<{
  type: "MultiPolygon";
  coordinates: readonly (readonly (readonly (readonly [number, number])[])[])[];
}>;

export type CampusMapBuildingGeometry =
  CampusMapPolygon | CampusMapMultiPolygon;

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
  geometry: CampusMapBuildingGeometry | CampusMapLineString;
  heightMetres: number;
  minimumHeightMetres: number;
  sourceProperties: Readonly<Record<string, unknown>>;
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
  dataStatus: "example" | "mapped" | "verified";
  mapDisplayKind: "building" | "point";
  isRoutable: boolean;
  searchTerms: readonly string[];
  sortOrder: number;
  details: readonly CampusMapPlaceDetail[];
}>;

export type CampusMapIndoorMap = Readonly<{
  id: string;
  buildingPlaceId: string;
  name: string;
  revision: number;
  document: CampusIndoorDocument;
}>;

export type CampusMapData = Readonly<{
  campus: CampusMapCampus | null;
  layers: readonly CampusMapLayer[];
  places: readonly CampusMapPlace[];
  features: readonly CampusMapFeature[];
  indoorMaps: readonly CampusMapIndoorMap[];
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

export function isCampusMapMultiPolygon(
  value: unknown,
): value is CampusMapMultiPolygon {
  if (!value || typeof value !== "object") return false;
  const coordinates = Reflect.get(value, "coordinates");
  return (
    Reflect.get(value, "type") === "MultiPolygon" &&
    Array.isArray(coordinates) &&
    coordinates.length > 0 &&
    coordinates.every(
      (polygon) =>
        Array.isArray(polygon) &&
        polygon.length > 0 &&
        polygon.every(
          (ring) =>
            Array.isArray(ring) && ring.length >= 4 && ring.every(isCoordinate),
        ),
    )
  );
}

export function isCampusMapBuildingGeometry(
  value: unknown,
): value is CampusMapBuildingGeometry {
  return isCampusMapPolygon(value) || isCampusMapMultiPolygon(value);
}

function isCoordinateInRing(
  coordinate: readonly [number, number],
  ring: readonly GeoJSON.Position[],
) {
  const [longitude, latitude] = coordinate;
  let isInside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    index++
  ) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude;
    const crossingLongitude =
      ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) +
      currentLongitude;

    if (crossesLatitude && longitude < crossingLongitude) {
      isInside = !isInside;
    }
    previous = index;
  }

  return isInside;
}

export function isCoordinateInBuildingGeometry(
  coordinate: readonly [number, number],
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.some(
    (polygon) =>
      polygon.length > 0 &&
      isCoordinateInRing(coordinate, polygon[0]) &&
      polygon.slice(1).every((hole) => !isCoordinateInRing(coordinate, hole)),
  );
}

export function isCoordinateNearBuildingGeometry(
  coordinate: readonly [number, number],
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  tolerance = 0.00005,
) {
  if (isCoordinateInBuildingGeometry(coordinate, geometry)) return true;

  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const coordinates = polygons.flatMap((polygon) =>
    polygon.flatMap((ring) => ring),
  );
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const [longitude, latitude] = coordinate;

  return (
    longitude >= Math.min(...longitudes) - tolerance &&
    longitude <= Math.max(...longitudes) + tolerance &&
    latitude >= Math.min(...latitudes) - tolerance &&
    latitude <= Math.max(...latitudes) + tolerance
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
      ...(place.searchTerms ?? []),
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

export function isMapStyleLayer(layer: CampusMapLayer) {
  return layer.layerKind !== "place" && layer.styleLayerPatterns.length > 0;
}

export function isPlaceFilterLayer(layer: CampusMapLayer) {
  return layer.layerKind === "place";
}

function matchesStyleLayerGlob(styleLayerId: string, pattern: string) {
  const glob = pattern.startsWith("!") ? pattern.slice(1) : pattern;
  return glob.endsWith("*")
    ? styleLayerId.startsWith(glob.slice(0, -1))
    : styleLayerId === glob;
}

export function campusLayerControlsStyleLayer(
  layer: CampusMapLayer,
  styleLayerId: string,
) {
  if (!isMapStyleLayer(layer)) return false;
  const included = layer.styleLayerPatterns
    .filter((pattern) => !pattern.startsWith("!"))
    .some((pattern) => matchesStyleLayerGlob(styleLayerId, pattern));
  const excluded = layer.styleLayerPatterns
    .filter((pattern) => pattern.startsWith("!"))
    .some((pattern) => matchesStyleLayerGlob(styleLayerId, pattern));
  return included && !excluded;
}

export function getControlledStyleLayerVisibility(
  styleLayerId: string,
  layers: readonly CampusMapLayer[],
  visibleLayerSlugs: ReadonlySet<string>,
) {
  const controllingLayers = layers.filter((layer) =>
    campusLayerControlsStyleLayer(layer, styleLayerId),
  );
  if (controllingLayers.length === 0) return null;
  return controllingLayers.some((layer) => visibleLayerSlugs.has(layer.slug))
    ? "visible"
    : "none";
}

export function formatWalkingDistance(distanceMetres: number) {
  if (distanceMetres < 1000) return `${Math.round(distanceMetres)} m`;
  return `${(distanceMetres / 1000).toFixed(1)} km`;
}

export function formatWalkingDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min walk`;
}
