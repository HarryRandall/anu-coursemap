import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function compileModule(sourcePath, targetPath, replacements = []) {
  const source = await readFile(sourcePath, "utf8");
  let compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  for (const [pattern, replacement] of replacements) {
    compiled = compiled.replace(pattern, replacement);
  }
  await writeFile(targetPath, compiled);
}

async function loadCampusMapModules() {
  const directory = await mkdtemp(join(tmpdir(), "coursemap-room-finder-"));
  const campusMapTarget = join(directory, "campus-map.js");
  const routingTarget = join(directory, "routing.js");

  await compileModule(
    new URL("../lib/rooms/campus-map.ts", import.meta.url),
    campusMapTarget,
  );
  await compileModule(
    new URL("../lib/rooms/routing.ts", import.meta.url),
    routingTarget,
    [[/from "\.\/campus-map";/, 'from "./campus-map.js";']],
  );

  return Promise.all([
    import(pathToFileURL(campusMapTarget).href),
    import(pathToFileURL(routingTarget).href),
  ]);
}

const [campusMap, routing] = await loadCampusMapModules();
const demoData = JSON.parse(
  await readFile(
    new URL("../lib/rooms/demo-campus-map.json", import.meta.url),
    "utf8",
  ),
);
const visibleLayers = campusMap.getDefaultVisibleLayerSlugs(demoData.layers);

test("copies both MapLibre worker modules for Next builds", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const workerScript = await readFile(
    new URL("../scripts/copy-maplibre-worker.mjs", import.meta.url),
    "utf8",
  );
  const mapComponent = await readFile(
    new URL("../components/rooms/campus-map.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    packageJson.scripts.predev,
    "node scripts/copy-maplibre-worker.mjs",
  );
  assert.equal(
    packageJson.scripts.prebuild,
    "node scripts/copy-maplibre-worker.mjs",
  );
  assert.match(workerScript, /maplibre-gl-worker\.mjs/);
  assert.match(workerScript, /maplibre-gl-shared\.mjs/);
  assert.match(
    mapComponent,
    /setWorkerUrl\("\/maplibre\/maplibre-gl-worker\.mjs"\)/,
  );
});

test("filters dynamic places by layer, address and detail", () => {
  assert.deepEqual(
    campusMap
      .filterCampusPlaces(
        demoData.places,
        demoData.layers,
        visibleLayers,
        "Marie Reay",
      )
      .map((place) => place.slug),
    ["marie-reay-teaching-centre"],
  );
  assert.deepEqual(
    campusMap
      .filterCampusPlaces(
        demoData.places,
        demoData.layers,
        visibleLayers,
        "Ellery 1.23",
      )
      .map((place) => place.slug),
    ["ad-hope-building"],
  );
  assert.deepEqual(
    campusMap
      .filterCampusPlaces(
        demoData.places,
        demoData.layers,
        new Set(["study-spaces"]),
        "study",
      )
      .map((place) => place.slug),
    ["chifley-library"],
  );
});

test("filters mapped buildings by imported aliases and building numbers", () => {
  const place = {
    ...demoData.places[0],
    searchTerms: ["Building 101", "Old Administration Block"],
  };

  assert.deepEqual(
    campusMap
      .filterCampusPlaces([place], demoData.layers, visibleLayers, "old 101")
      .map((candidate) => candidate.slug),
    [place.slug],
  );
});

test("finds places and honours layer visibility", () => {
  assert.equal(
    campusMap.findCampusPlace(demoData.places, "beryl-rawson-building")?.name,
    "Beryl Rawson Building",
  );
  assert.equal(
    campusMap.findCampusPlace(demoData.places, "missing"),
    undefined,
  );
  assert.equal(
    campusMap.filterCampusPlaces(
      demoData.places,
      demoData.layers,
      new Set(["student-services"]),
      "",
    ).length,
    1,
  );
});

test("supplies dynamic map layers and preserves imported feature provenance", () => {
  assert.equal(demoData.layers.length, 13);
  const buildingFeatures = demoData.features.filter(
    (feature) => feature.featureKind === "building",
  );
  assert.ok(buildingFeatures.length > 250);
  assert.equal(buildingFeatures.length, demoData.places.length);
  assert.equal(
    demoData.features.filter(
      (feature) => feature.featureKind === "walking_path",
    ).length,
    3,
  );
  assert.ok(campusMap.isCampusMapPolygon(demoData.campus.boundary));
  assert.equal(
    demoData.campus.initialZoom - demoData.campus.minZoom,
    3,
    "the campus preview allows exactly three zoom-out steps",
  );
  for (const feature of demoData.features) {
    assert.match(feature.sourceIdentifier, /^(?:way|relation)\/\d+$/);
    assert.match(
      feature.sourceUrl,
      /^https:\/\/www\.openstreetmap\.org\/(?:way|relation)\//,
    );
  }
});

test("maps OpenFreeMap style layers into independently toggleable groups", () => {
  const layerBySlug = new Map(
    demoData.layers.map((layer) => [layer.slug, layer]),
  );
  const buildings = layerBySlug.get("buildings");
  const roads = layerBySlug.get("roads");
  const paths = layerBySlug.get("walking-paths");
  const terrain = layerBySlug.get("terrain");

  assert.ok(campusMap.isMapStyleLayer(buildings));
  assert.ok(campusMap.isMapStyleLayer(roads));
  assert.ok(campusMap.isPlaceFilterLayer(layerBySlug.get("study-spaces")));
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(buildings, "building-3d"),
    false,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(
      buildings,
      "coursemap-anu-buildings-3d",
    ),
    true,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(roads, "road_minor"),
    true,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(roads, "road_path_pedestrian"),
    false,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(
      paths,
      "bridge_path_pedestrian_casing",
    ),
    true,
  );
  assert.equal(
    campusMap.getControlledStyleLayerVisibility(
      "coursemap-terrain-hillshade",
      demoData.layers,
      new Set([terrain.slug]),
    ),
    "visible",
  );
  assert.equal(
    campusMap.getControlledStyleLayerVisibility(
      "coursemap-terrain-hillshade",
      demoData.layers,
      new Set(),
    ),
    "none",
  );
  assert.equal(
    campusMap.getControlledStyleLayerVisibility(
      "uncontrolled-style-layer",
      demoData.layers,
      new Set(),
    ),
    null,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(
      layerBySlug.get("points-of-interest"),
      "poi_z16",
    ),
    true,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(
      layerBySlug.get("place-labels"),
      "label_city",
    ),
    true,
  );
  assert.equal(
    campusMap.campusLayerControlsStyleLayer(
      layerBySlug.get("road-and-water-names"),
      "highway-name-major",
    ),
    true,
  );
});

test("links every building place to a stored building footprint", () => {
  const buildingPlaces = demoData.places.filter(
    (place) => place.mapDisplayKind === "building",
  );
  assert.ok(buildingPlaces.length > 250);
  assert.equal(
    demoData.places.filter((place) => place.mapDisplayKind === "point").length,
    0,
  );
  assert.equal(
    demoData.features.filter(
      (feature) =>
        feature.featureKind === "building" &&
        buildingPlaces.some((place) => place.id === feature.placeId),
    ).length,
    buildingPlaces.length,
  );

  const marieReayFeature = demoData.features.find(
    (feature) => feature.slug === "marie-reay-building-outline",
  );
  assert.ok(marieReayFeature);
  assert.equal(
    campusMap.isCoordinateNearBuildingGeometry(
      buildingPlaces.find(
        (place) => place.slug === "marie-reay-teaching-centre",
      ).coordinates,
      marieReayFeature.geometry,
    ),
    true,
  );
});

test("accepts Polygon and MultiPolygon building footprints", () => {
  assert.equal(
    campusMap.isCampusMapBuildingGeometry({
      type: "Polygon",
      coordinates: [
        [
          [149.12, -35.28],
          [149.13, -35.28],
          [149.13, -35.27],
          [149.12, -35.28],
        ],
      ],
    }),
    true,
  );
  assert.equal(
    campusMap.isCampusMapBuildingGeometry({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [149.12, -35.28],
            [149.13, -35.28],
            [149.13, -35.27],
            [149.12, -35.28],
          ],
        ],
        [
          [
            [149.14, -35.28],
            [149.15, -35.28],
            [149.15, -35.27],
            [149.14, -35.28],
          ],
        ],
      ],
    }),
    true,
  );
  assert.equal(
    campusMap.isCampusMapBuildingGeometry({
      type: "MultiPolygon",
      coordinates: [],
    }),
    false,
  );
});

test("renders only stored ANU buildings in 3D", async () => {
  const mapComponent = await readFile(
    new URL("../components/rooms/campus-map.tsx", import.meta.url),
    "utf8",
  );
  const roomFinder = await readFile(
    new URL("../components/rooms/room-finder.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(mapComponent, /setTerrain/);
  assert.match(mapComponent, /type: "hillshade"/);
  assert.match(mapComponent, /dragRotate: true/);
  assert.match(mapComponent, /maxPitch: 65/);
  assert.match(mapComponent, /coursemap-anu-buildings/);
  assert.match(mapComponent, /buildAnuBuildingCollection/);
  assert.match(mapComponent, /features\.filter\(isStoredBuildingFeature\)/);
  assert.match(mapComponent, /setLayerZoomRange/);
  assert.match(mapComponent, /NATIVE_BUILDING_MAX_ZOOM = 24/);
  assert.match(mapComponent, /isNativeBuildingExtrusionLayer/);
  assert.match(mapComponent, /minimumHeightMetres/);
  assert.match(mapComponent, /getBuildingFeaturesForPlace/);
  assert.match(roomFinder, /features=\{data\.features\}/);
  assert.match(mapComponent, /type: "fill-extrusion"/);
  assert.doesNotMatch(mapComponent, /feature-state/);
  assert.doesNotMatch(
    mapComponent,
    /createPlaceMarker|createEndpointMarker|room-map-marker|room-route-endpoint/,
  );
  assert.doesNotMatch(mapComponent, /campus-features|campus-mask/);
});

test("builds an HTTPS walking route request for the selected places", () => {
  const from = demoData.places[0];
  const to = demoData.places[1];
  const routeUrl = routing.buildWalkingRouteUrl(
    from,
    to,
    "https://routing.example.test/foot/route/v1/driving",
  );
  const [fromLongitude, fromLatitude] = from.coordinates;
  const [toLongitude, toLatitude] = to.coordinates;

  assert.equal(routeUrl.protocol, "https:");
  assert.equal(
    routeUrl.pathname,
    `/foot/route/v1/driving/${fromLongitude},${fromLatitude};${toLongitude},${toLatitude}`,
  );
  assert.equal(routeUrl.searchParams.get("geometries"), "geojson");
  assert.throws(
    () =>
      routing.buildWalkingRouteUrl(
        from,
        to,
        "http://routing.example.test/route",
      ),
    /must use HTTPS/,
  );
});

test("accepts usable walking routes and rejects malformed responses", () => {
  assert.deepEqual(
    routing.parseWalkingRouteResponse({
      routes: [
        {
          distance: 410.4,
          duration: 322.1,
          geometry: {
            coordinates: [
              [149.12, -35.27],
              [149.13, -35.28],
            ],
          },
        },
      ],
    }),
    {
      coordinates: [
        [149.12, -35.27],
        [149.13, -35.28],
      ],
      distanceMetres: 410.4,
      durationSeconds: 322.1,
    },
  );
  assert.equal(routing.parseWalkingRouteResponse({ routes: [] }), null);
});
