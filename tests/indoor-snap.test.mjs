import assert from "node:assert/strict";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const { "indoor-snap": snap } = await loadLibModules(
  ["rooms/indoor-snap"],
  "indoor-snap",
);

const level = { id: "level-ground" };
const document = {
  walls: [
    {
      id: "wall-1",
      levelId: level.id,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      closed: false,
      openings: [],
    },
  ],
  spaces: [
    {
      id: "room-1",
      levelId: level.id,
      geometry: {
        type: "rectangle",
        x: 200,
        y: 200,
        width: 50,
        height: 50,
        cornerRadius: 0,
      },
    },
  ],
  connectors: [
    { id: "lift", levelIds: [level.id], position: { x: 400, y: 400 } },
  ],
  routeNodes: [
    { id: "junction", levelId: level.id, position: { x: 500, y: 500 } },
  ],
};

const targets = snap.collectSnapTargets(document, level.id);

test("collects vertices, corners and nodes from one level only", () => {
  assert.deepEqual(
    targets.points.filter((point) => point.kind === "vertex").length,
    2,
  );
  assert.equal(
    targets.points.filter((point) => point.kind === "corner").length,
    4,
  );
  assert.equal(
    targets.points.filter((point) => point.kind === "node").length,
    2,
  );
  assert.equal(targets.segments.length, 1);

  const otherLevel = snap.collectSnapTargets(document, "level-one");
  assert.deepEqual(otherLevel, { points: [], segments: [] });
});

test("excludes the shape being dragged so it cannot snap to itself", () => {
  const without = snap.collectSnapTargets(document, level.id, {
    excludeIds: new Set(["wall-1"]),
  });
  assert.equal(without.segments.length, 0);
  assert.equal(
    without.points.filter((point) => point.kind === "vertex").length,
    0,
  );
});

test("prefers a wall vertex over a room corner, a node and the grid", () => {
  const crowded = snap.collectSnapTargets(
    {
      ...document,
      spaces: [
        {
          id: "room-2",
          levelId: level.id,
          geometry: {
            type: "polygon",
            points: [
              { x: 2, y: 2 },
              { x: 60, y: 2 },
              { x: 60, y: 40 },
            ],
          },
        },
      ],
    },
    level.id,
  );

  const result = snap.snapPoint({ x: 1, y: 1 }, crowded, 10, { gridStep: 10 });
  assert.equal(result.kind, "vertex");
  assert.deepEqual(result.point, { x: 0, y: 0 });
});

test("falls back to a wall edge, then the grid, then the raw point", () => {
  const onEdge = snap.snapPoint({ x: 50, y: 4 }, targets, 10, {
    gridStep: 25,
  });
  assert.equal(onEdge.kind, "edge");
  assert.deepEqual(onEdge.point, { x: 50, y: 0 });
  assert.equal(onEdge.targetId, "wall-1:0");

  const onGrid = snap.snapPoint({ x: 622, y: 731 }, targets, 10, {
    gridStep: 25,
  });
  assert.equal(onGrid.kind, "grid");
  assert.deepEqual(onGrid.point, { x: 625, y: 725 });

  const free = snap.snapPoint({ x: 622, y: 731 }, targets, 10);
  assert.equal(free.kind, "free");
  assert.deepEqual(free.point, { x: 622, y: 731 });
});

test("tolerance is honoured exactly", () => {
  assert.equal(snap.snapPoint({ x: 0, y: 9 }, targets, 10).kind, "vertex");
  assert.equal(snap.snapPoint({ x: 0, y: 11 }, targets, 10).kind, "free");
});

test("the axis lock constrains to horizontal, vertical and 45 degrees", () => {
  const origin = { x: 100, y: 100 };
  assert.deepEqual(snap.applyAxisLock(origin, { x: 180, y: 105 }), {
    x: 180,
    y: 100,
  });
  assert.deepEqual(snap.applyAxisLock(origin, { x: 105, y: 180 }), {
    x: 100,
    y: 180,
  });
  assert.deepEqual(snap.applyAxisLock(origin, { x: 160, y: 40 }), {
    x: 160,
    y: 40,
  });
  assert.deepEqual(snap.applyAxisLock(origin, { x: 150, y: 170 }), {
    x: 160,
    y: 160,
  });
});

test("the axis lock applies before any other snapping", () => {
  // Locked vertically to x = 100, the point lands within tolerance of the wall
  // vertex there and snaps onto it.
  const onto = snap.snapPoint({ x: 96, y: 8 }, targets, 10, {
    axisLock: true,
    axisOrigin: { x: 100, y: 0 },
  });
  assert.equal(onto.kind, "vertex");
  assert.deepEqual(onto.point, { x: 100, y: 0 });

  // Locked to the same axis but far from anything, the lock still holds.
  const held = snap.snapPoint({ x: 96, y: 40 }, targets, 10, {
    axisLock: true,
    axisOrigin: { x: 100, y: 0 },
  });
  assert.equal(held.kind, "free");
  assert.deepEqual(held.point, { x: 100, y: 40 });
});
