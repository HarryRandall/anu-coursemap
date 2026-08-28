import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const modules = await loadLibModules(
  ["rooms/indoor-journey", "rooms/indoor-room-index", "rooms/indoor-map"],
  "indoor-journey",
);
const journey = modules["indoor-journey"];
const roomIndex = modules["indoor-room-index"];
const indoorMap = modules["indoor-map"];

const demo = JSON.parse(
  await readFile(
    new URL("../lib/rooms/demo-campus-map.json", import.meta.url),
    "utf8",
  ),
);
const indoorDocument = demo.indoorMaps[0].document;
const rooms = roomIndex.buildCampusRoomIndex(demo.indoorMaps, demo.places);
const groundRoom = rooms.find((room) => room.levelRef === "G");
const upperRoom = rooms.find((room) => room.levelRef === "1");

function build(targetSpaceId, options = {}) {
  return journey.buildIndoorJourney({
    document: indoorDocument,
    buildingName: "Forestry Building",
    targetSpaceId,
    ...options,
  });
}

test("indexes every published searchable room with its building and floor", () => {
  assert.equal(rooms.length, 14);
  assert.equal(groundRoom.buildingName, "Forestry Building");
  assert.equal(groundRoom.buildingSlug, "osm-way-52333714");
  assert.ok(groundRoom.roomId.length > 0);
  assert.ok(groundRoom.searchText.includes("forestry"));
});

test("ranks an exact room reference above a partial or a name match", () => {
  const matches = roomIndex.matchCampusRooms(rooms, "G01");
  assert.equal(matches[0].ref, "G01");

  const byName = roomIndex.matchCampusRooms(rooms, "seminar", 3);
  assert.equal(byName.length, 3);
  assert.ok(byName.every((room) => room.name === "Seminar room"));

  assert.deepEqual(roomIndex.matchCampusRooms(rooms, "   "), []);
  assert.equal(roomIndex.matchCampusRooms(rooms, "room", 2).length, 2);
});

test("finds one room by its stable identifier for a deep link", () => {
  assert.equal(
    roomIndex.findCampusRoom(rooms, groundRoom.roomId).ref,
    groundRoom.ref,
  );
  assert.equal(roomIndex.findCampusRoom(rooms, "nope"), null);
});

test("a journey starts at an entrance and walks in", () => {
  const result = build(groundRoom.roomId);
  assert.ok(result);
  assert.equal(result.steps[0].kind, "approach");
  assert.equal(result.steps[0].buildingName, "Forestry Building");
  assert.ok(result.distanceMetres > 0);

  const entrances = journey.listIndoorEntrances(indoorDocument);
  assert.ok(entrances.length > 0);
  assert.equal(result.entranceNodeId, entrances[0].id);
});

test("crossing floors emits a connector step between two level steps", () => {
  const result = build(upperRoom.roomId);
  assert.deepEqual(
    result.steps.map((step) => step.kind),
    ["approach", "level", "connector", "level"],
  );

  const [, ground, lift, upper] = result.steps;
  assert.equal(ground.levelRef, "G");
  assert.equal(ground.arrives, false);
  assert.equal(lift.connectorKind, "lift");
  assert.equal(lift.fromLevelId, ground.levelId);
  assert.equal(lift.toLevelId, upper.levelId);
  assert.equal(upper.levelRef, "1");
  assert.equal(upper.arrives, true);
  assert.ok(
    upper.polyline.length >= 2,
    "a level step can be drawn on the plan",
  );
});

test("the walking and vertical legs together account for the whole journey", () => {
  const result = build(upperRoom.roomId);
  // A lift leg is vertical, so it belongs to the connector step rather than to
  // either floor's walk; the two together must still reconcile.
  const total = result.steps.reduce(
    (sum, step) => sum + (step.kind === "approach" ? 0 : step.distanceMetres),
    0,
  );
  assert.ok(
    Math.abs(total - result.distanceMetres) < 0.05,
    `steps sum to ${total} but the route is ${result.distanceMetres}`,
  );

  const lift = result.steps.find((step) => step.kind === "connector");
  assert.ok(lift.distanceMetres > 0, "the vertical leg is reported");
});

test("an unreachable or unknown room has no journey", () => {
  assert.equal(build("not-a-room"), null);
  assert.equal(
    build(upperRoom.roomId, { entranceNodeId: "not-an-entrance" }),
    null,
  );
});

test("a document with no way in has no journey", () => {
  const sealed = indoorMap.buildIndoorRouteGraph({
    ...indoorDocument,
    walls: indoorDocument.walls.map((wall) => ({
      ...wall,
      openings: wall.openings.filter((opening) => !opening.exterior),
    })),
  });
  assert.deepEqual(journey.listIndoorEntrances(sealed), []);
  assert.equal(
    journey.buildIndoorJourney({
      document: sealed,
      buildingName: "Forestry Building",
      targetSpaceId: groundRoom.roomId,
    }),
    null,
  );
});
