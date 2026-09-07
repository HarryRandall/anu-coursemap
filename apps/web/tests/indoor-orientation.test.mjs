import assert from "node:assert/strict";
import { test } from "vitest";
const modules = {
  "indoor-orientation": await import("../lib/rooms/indoor-orientation.ts"),
  "indoor-move": await import("../lib/rooms/indoor-move.ts"),
  "indoor-grid-scene": await import("../lib/rooms/indoor-grid-scene.ts"),
  "indoor-snap": await import("../lib/rooms/indoor-snap.ts"),
  "indoor-placement-feedback":
    await import("../lib/rooms/indoor-placement-feedback.ts"),
};
const { rotateDrawingPoint, alignedRectangle, buildingDrawingAngle } =
  modules["indoor-orientation"];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test("aligned rectangles and grid snapping use the same building axes", () => {
  const angle = 32;
  const origin = rotateDrawingPoint({ x: 20, y: 30 }, angle);
  const current = rotateDrawingPoint({ x: 70, y: 60 }, angle);
  const ring = alignedRectangle(origin, current, angle).map((point) =>
    rotateDrawingPoint(point, -angle),
  );
  near(ring[1].x, 70);
  near(ring[1].y, 30);
  near(ring[3].x, 20);
  near(ring[3].y, 60);
  const snapped = modules["indoor-snap"].snapPoint(
    rotateDrawingPoint({ x: 23, y: 37 }, angle),
    { points: [], segments: [] },
    10,
    { drawingAngle: angle, gridStep: 10 },
  );
  const point = rotateDrawingPoint(snapped.point, -angle);
  near(point.x, 20);
  near(point.y, 40);
  near(buildingDrawingAngle(alignedRectangle(origin, current, angle)), angle);
});
test("collision markers identify the crossed edges and contained rooms", () => {
  const ring = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const other = ring.map((point) => ({ x: point.x + 5, y: point.y + 5 }));
  assert.equal(
    modules["indoor-placement-feedback"].ringContacts(ring, other).length,
    2,
  );
  const room = {
    id: "room",
    kind: "room",
    geometry: { type: "rectangle", x: 2, y: 2, width: 2, height: 2 },
  };
  assert.equal(
    modules["indoor-placement-feedback"].overlappingRooms(ring, [room]).length,
    1,
  );
  assert.equal(
    modules["indoor-placement-feedback"].overlappingRooms(ring, [room], "room")
      .length,
    0,
  );
});

test("a room dragged beyond the footprint stops flush at the edge", () => {
  const ring = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const footprint = {
    outline: ring,
    polygons: [{ exterior: ring, holes: [] }],
  };
  const room = { type: "rectangle", x: 20, y: 20, width: 30, height: 20 };
  const delta = modules["indoor-move"].constrainIndoorMove(
    room,
    { x: -50, y: 0 },
    footprint,
  );
  assert.ok(Math.abs(room.x + delta.x) < 0.001);
  const right = modules["indoor-move"].constrainIndoorMove(
    room,
    { x: 100, y: 0 },
    footprint,
  );
  assert.ok(Math.abs(room.x + room.width + right.x - 100) < 0.001);
  assert.deepEqual(
    modules["indoor-move"].constrainIndoorMove(room, { x: 4, y: 5 }, footprint),
    { x: 4, y: 5 },
  );
});

test("visible grid has major lines and becomes finer with zoom", () => {
  const projection = {
    viewBox: { width: 100, height: 100 },
    reference: { west: 149, north: -35, latitude: -35, offsetX: 0, offsetY: 0 },
    metresPerUnit: 0.1,
  };
  const coarse = modules["indoor-grid-scene"].buildIndoorGrid(
    projection,
    30,
    1,
  );
  const fine = modules["indoor-grid-scene"].buildIndoorGrid(projection, 30, 10);
  assert.ok(fine.features.length > coarse.features.length);
  assert.ok(fine.features.some((feature) => feature.properties.major));
});
