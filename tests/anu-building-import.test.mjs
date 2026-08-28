import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSnapshot,
  buildingAddress,
  buildingName,
  migrationOutputPath,
  migrationSql,
  relationGeometry,
  safeBuildingHeights,
  sourceIdentifier,
  stableUuid,
  toDemoData,
} from "../scripts/rooms/sync-anu-buildings.mjs";

const [raw, demo, migration] = await Promise.all([
  readFile(
    new URL(
      "../scripts/fixtures/anu-acton-buildings-overpass.json",
      import.meta.url,
    ),
    "utf8",
  ).then(JSON.parse),
  readFile(
    new URL("../lib/rooms/demo-campus-map.json", import.meta.url),
    "utf8",
  ).then(JSON.parse),
  readFile(
    new URL(
      "../supabase/migrations/20260828170100_import_anu_acton_buildings.sql",
      import.meta.url,
    ),
    "utf8",
  ),
]);

test("builds a complete deterministic ANU Acton building snapshot", () => {
  const snapshot = buildSnapshot(raw, demo);

  assert.equal(snapshot.metadata.rawElementCount, 288);
  assert.equal(snapshot.metadata.skippedNodeCount, 2);
  assert.equal(snapshot.metadata.buildingCount, 283);
  assert.equal(snapshot.metadata.namedSourceCount, 207);
  assert.match(snapshot.metadata.sourceHash, /^[0-9a-f]{64}$/);
  assert.equal(
    new Set(snapshot.buildings.map((building) => building.sourceIdentifier))
      .size,
    snapshot.buildings.length,
  );
  assert.equal(
    snapshot.buildings.find(
      (building) => building.slug === "student-hub-kambri",
    )?.sourceIdentifier,
    "way/672271093",
  );
  assert.deepEqual(demo.snapshot, snapshot.metadata);
  assert.deepEqual(toDemoData(demo, snapshot), demo);
  assert.equal(migrationSql(snapshot), migration);
});

test("requires future snapshots to use a new forward migration", () => {
  assert.match(
    migrationOutputPath("20260829090000_import_anu_acton_buildings.sql"),
    /supabase\/migrations\/20260829090000_import_anu_acton_buildings\.sql$/,
  );
  assert.throws(
    () => migrationOutputPath("../rewrite_existing_migration.sql"),
    /timestamped ANU building import migration filename/,
  );
  assert.match(
    migration,
    /when places\.data_status = 'verified' then places\.latitude/,
  );
});

test("uses honest names and addresses when OpenStreetMap tags are sparse", () => {
  const element = { type: "way", id: 42, tags: { building: "yes" } };
  assert.equal(buildingName(element), "Unnamed ANU building (way 42)");
  assert.equal(buildingAddress(element.tags), "ANU Acton campus");
  assert.equal(sourceIdentifier(element), "way/42");

  assert.equal(
    buildingAddress({
      "addr:housenumber": "10",
      "addr:street": "University Avenue",
    }),
    "10 University Avenue",
  );
});

test("derives safe building heights without allowing inverted bases", () => {
  assert.deepEqual(safeBuildingHeights({ "building:levels": "4" }), {
    heightMetres: 14.64,
    minimumHeightMetres: 0,
  });
  assert.deepEqual(safeBuildingHeights({ height: "7 m", min_height: "12" }), {
    heightMetres: 7,
    minimumHeightMetres: 7,
  });
  assert.deepEqual(safeBuildingHeights({ building: "shed" }), {
    heightMetres: 3,
    minimumHeightMetres: 0,
  });
});

test("assembles relation members into a multipolygon", () => {
  const geometry = relationGeometry({
    id: 7,
    members: [
      {
        type: "way",
        role: "outer",
        geometry: [
          { lon: 149.1, lat: -35.2 },
          { lon: 149.2, lat: -35.2 },
          { lon: 149.2, lat: -35.3 },
          { lon: 149.1, lat: -35.3 },
          { lon: 149.1, lat: -35.2 },
        ],
      },
      {
        type: "way",
        role: "outer",
        geometry: [
          { lon: 149.3, lat: -35.2 },
          { lon: 149.4, lat: -35.2 },
          { lon: 149.4, lat: -35.3 },
          { lon: 149.3, lat: -35.3 },
          { lon: 149.3, lat: -35.2 },
        ],
      },
    ],
  });

  assert.equal(geometry.type, "MultiPolygon");
  assert.equal(geometry.coordinates.length, 2);
});

test("generates stable source-derived UUIDs", () => {
  const first = stableUuid("place", "way/42");
  assert.equal(first, stableUuid("place", "way/42"));
  assert.notEqual(first, stableUuid("feature", "way/42"));
  assert.match(
    first,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});
