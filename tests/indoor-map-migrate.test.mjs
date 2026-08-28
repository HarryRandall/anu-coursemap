import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const modules = await loadLibModules(
  [
    "rooms/indoor-map",
    "rooms/indoor-map-migrate",
    "rooms/indoor-geometry",
    "rooms/indoor-walls",
  ],
  "indoor-migrate",
);
const indoorMap = modules["indoor-map"];
const migrate = modules["indoor-map-migrate"];

/** The version 1 document seeded for the Copland Building. */
const coplandV1 = JSON.parse(
  await readFile(
    new URL("./fixtures/indoor-copland-v1.json", import.meta.url),
    "utf8",
  ),
);

test("upgrades the seeded version 1 document into a parseable version 2", () => {
  const upgraded = migrate.upgradeCampusIndoorDocument(coplandV1);
  assert.equal(upgraded.version, 2);

  const parsed = indoorMap.parseCampusIndoorDocument(upgraded);
  assert.equal(parsed.levels.length, coplandV1.levels.length);
  assert.equal(parsed.spaces.length, coplandV1.spaces.length);
  assert.equal(parsed.connectors.length, coplandV1.connectors.length);
});

test("draws every level outline as a closed perimeter wall with a stable id", () => {
  const upgraded = migrate.upgradeCampusIndoorDocument(coplandV1);

  assert.equal(upgraded.walls.length, coplandV1.levels.length);
  coplandV1.levels.forEach((level, index) => {
    const wall = upgraded.walls[index];
    assert.equal(wall.id, `wall-outline-${level.id}`);
    assert.equal(wall.levelId, level.id);
    assert.equal(wall.kind, "structural");
    assert.equal(wall.closed, true);
    assert.equal(wall.thickness, 2);
    assert.deepEqual(wall.openings, []);
    assert.deepEqual(wall.points, level.outline);
  });
});

test("drops the routing mode and keeps every other key", () => {
  const upgraded = migrate.upgradeCampusIndoorDocument({
    ...coplandV1,
    routingMode: "automatic",
  });
  assert.ok(!("routingMode" in upgraded));
  assert.deepEqual(upgraded.viewBox, coplandV1.viewBox);
  assert.deepEqual(upgraded.spaces, coplandV1.spaces);
});

test("keeps authored route nodes, including version 1 doors with no opening", () => {
  const level = coplandV1.levels[0];
  const space = coplandV1.spaces[0];
  const authored = {
    ...coplandV1,
    routeNodes: [
      {
        id: "legacy-door",
        levelId: level.id,
        kind: "door",
        position: { x: 200, y: 145 },
        spaceId: space.id,
        accessibility: "accessible",
      },
    ],
  };

  const parsed = migrate.readCampusIndoorDocument(authored);
  assert.equal(parsed.routeNodes[0].id, "legacy-door");
  assert.ok(
    !("openingId" in parsed.routeNodes[0]),
    "a version 1 door simply carries no opening",
  );
});

test("is idempotent and leaves an existing version 2 document alone", () => {
  const once = migrate.upgradeCampusIndoorDocument(coplandV1);
  const twice = migrate.upgradeCampusIndoorDocument(once);
  assert.deepEqual(twice, once);
  assert.equal(migrate.upgradeCampusIndoorDocument(once), once);
});

test("refuses a version it cannot upgrade", () => {
  assert.throws(
    () => migrate.upgradeCampusIndoorDocument({ ...coplandV1, version: 3 }),
    /cannot be upgraded/u,
  );
  assert.throws(
    () => migrate.upgradeCampusIndoorDocument({ version: 1 }),
    /levels is not an array/u,
  );
  assert.throws(
    () =>
      migrate.upgradeCampusIndoorDocument({
        version: 1,
        levels: [{ id: "level-ground", outline: [{ x: 0, y: 0 }] }],
      }),
    /is not a polygon/u,
  );
});

test("the reader parses old and new documents, the strict parser only new ones", () => {
  assert.equal(migrate.readCampusIndoorDocument(coplandV1).version, 2);
  assert.throws(
    () => indoorMap.parseCampusIndoorDocument(coplandV1),
    /version 2/u,
  );
});
