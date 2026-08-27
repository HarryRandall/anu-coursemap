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

test("supplies ANU-scoped building and walking vectors with provenance", () => {
  assert.equal(demoData.layers.length, 4);
  assert.equal(
    demoData.features.filter((feature) => feature.featureKind === "building")
      .length,
    4,
  );
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
    assert.match(feature.sourceIdentifier, /^way\/\d+$/);
    assert.match(
      feature.sourceUrl,
      /^https:\/\/www\.openstreetmap\.org\/way\//,
    );
  }
});

test("builds an HTTPS walking route request for the selected places", () => {
  const from = demoData.places[0];
  const to = demoData.places[1];
  const routeUrl = routing.buildWalkingRouteUrl(
    from,
    to,
    "https://routing.example.test/foot/route/v1/driving",
  );

  assert.equal(routeUrl.protocol, "https:");
  assert.match(
    routeUrl.pathname,
    /149\.120685,-35\.277786;149\.122333,-35\.278959$/,
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
