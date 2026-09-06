import assert from "node:assert/strict";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";
const modules = await loadLibModules(
  [
    "rooms/indoor-orientation",
    "rooms/indoor-snap",
    "rooms/indoor-placement-feedback",
  ],
  "indoor-orientation",
);
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
