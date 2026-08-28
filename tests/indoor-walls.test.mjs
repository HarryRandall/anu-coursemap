import assert from "node:assert/strict";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const { "indoor-walls": walls } = await loadLibModules(
  ["rooms/indoor-walls"],
  "indoor-walls",
);

/** An open run of three points: 100 units east, then 50 units south. */
const openWall = {
  id: "wall-1",
  levelId: "level-ground",
  kind: "structural",
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
  ],
  thickness: 2,
  closed: false,
  openings: [],
};

const closedWall = {
  ...openWall,
  id: "wall-2",
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ],
  closed: true,
};

function withOpening(wall, opening) {
  return {
    ...wall,
    openings: [
      {
        id: "opening-1",
        kind: "door",
        segmentIndex: 0,
        offset: 0.5,
        width: 10,
        accessibility: "accessible",
        ...opening,
      },
    ],
  };
}

test("counts segments differently for open and closed walls", () => {
  assert.equal(walls.wallSegmentCount(openWall), 2);
  assert.equal(walls.wallSegmentCount(closedWall), 4);
  assert.equal(walls.wallSegmentCount({ points: [{ x: 0, y: 0 }] }), 0);

  assert.deepEqual(
    walls.wallSegments(closedWall).at(-1),
    { index: 3, start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
    "a closed wall joins its last point back to its first",
  );
  assert.equal(walls.wallLength(openWall), 150);
  assert.equal(walls.wallLength(closedWall), 400);
  assert.throws(() => walls.wallSegmentLength(openWall, 2), RangeError);
});

test("places an opening along its segment and reports the wall normal", () => {
  assert.deepEqual(
    walls.openingPoint(openWall, { segmentIndex: 0, offset: 0.25 }),
    { x: 25, y: 0 },
  );
  assert.deepEqual(
    walls.openingPoint(openWall, { segmentIndex: 1, offset: 0.5 }),
    { x: 100, y: 25 },
  );
  assert.throws(
    () => walls.openingPoint(openWall, { segmentIndex: 5, offset: 0 }),
    RangeError,
  );

  assert.deepEqual(walls.openingNormal(openWall, { segmentIndex: 0 }), {
    x: -0,
    y: 1,
  });
  assert.deepEqual(
    walls.openingEndpoints(openWall, {
      segmentIndex: 0,
      offset: 0.5,
      width: 20,
    }),
    [
      { x: 40, y: 0 },
      { x: 60, y: 0 },
    ],
  );
});

test("offsets an opening to either side so a door can find its room", () => {
  const [left, right] = walls.openingSides(
    openWall,
    { segmentIndex: 0, offset: 0.5 },
    5,
  );
  assert.deepEqual(left, { x: 50, y: 5 });
  assert.deepEqual(right, { x: 50, y: -5 });
});

test("projects a point onto the closest wall segment", () => {
  assert.deepEqual(walls.closestPointOnWall(openWall, { x: 40, y: -30 }), {
    point: { x: 40, y: 0 },
    segmentIndex: 0,
    offset: 0.4,
    distance: 30,
  });
  assert.equal(
    walls.closestPointOnWall({ points: [], closed: false }, { x: 0, y: 0 }),
    null,
  );

  const beyondTheEnd = walls.closestPointOnWall(openWall, { x: 400, y: 25 });
  assert.equal(beyondTheEnd.segmentIndex, 1);
  assert.equal(beyondTheEnd.offset, 0.5);
});

test("inserting a vertex splits the segment and reassigns its openings", () => {
  // The door sits at 80 units along a 100 unit segment; the split lands at 50.
  const wall = withOpening(openWall, { offset: 0.8, width: 10 });
  const split = walls.insertWallVertex(wall, 0, { x: 50, y: 0 });

  assert.equal(split.points.length, 4);
  assert.deepEqual(split.points[1], { x: 50, y: 0 });
  assert.equal(split.openings[0].segmentIndex, 1);
  assert.ok(Math.abs(split.openings[0].offset - 0.6) < 1e-9);
  assert.deepEqual(
    walls.openingPoint(split, split.openings[0]),
    walls.openingPoint(wall, wall.openings[0]),
    "the door must not move when a vertex is inserted",
  );
});

test("inserting a vertex keeps an opening on the near half and shifts later segments", () => {
  const wall = {
    ...withOpening(openWall, { offset: 0.2, width: 10 }),
    openings: [
      { ...withOpening(openWall, {}).openings[0], offset: 0.2, width: 10 },
      {
        id: "opening-2",
        kind: "door",
        segmentIndex: 1,
        offset: 0.5,
        width: 10,
        accessibility: "unknown",
      },
    ],
  };
  const split = walls.insertWallVertex(wall, 0, { x: 50, y: 0 });

  assert.equal(split.openings[0].segmentIndex, 0);
  assert.ok(Math.abs(split.openings[0].offset - 0.4) < 1e-9);
  assert.equal(
    split.openings[1].segmentIndex,
    2,
    "an opening after the split moves up one segment",
  );
  assert.equal(split.openings[1].offset, 0.5);
});

test("inserting a vertex projects the point back onto the segment", () => {
  const split = walls.insertWallVertex(openWall, 0, { x: 50, y: 999 });
  assert.deepEqual(split.points[1], { x: 50, y: 0 });
});

test("removing a vertex merges segments and keeps openings where they sat", () => {
  const wall = withOpening(openWall, {
    segmentIndex: 1,
    offset: 0.5,
    width: 10,
  });
  const before = walls.openingPoint(wall, wall.openings[0]);
  const reduced = walls.removeWallVertex(wall, 0);

  assert.equal(reduced.points.length, 2);
  assert.equal(reduced.openings.length, 1);
  assert.deepEqual(walls.openingPoint(reduced, reduced.openings[0]), before);
});

test("removing a vertex refuses to leave a wall without enough points", () => {
  assert.throws(
    () =>
      walls.removeWallVertex(
        { ...openWall, points: openWall.points.slice(0, 2) },
        0,
      ),
    RangeError,
  );
  assert.throws(() => walls.removeWallVertex(openWall, 9), RangeError);
});

test("moving a vertex keeps openings on their segment and narrows them to fit", () => {
  const wall = withOpening(openWall, { offset: 0.5, width: 60 });
  const moved = walls.moveWallVertex(wall, 1, { x: 40, y: 0 });

  assert.deepEqual(moved.points[1], { x: 40, y: 0 });
  assert.equal(moved.openings[0].segmentIndex, 0);
  assert.equal(
    moved.openings[0].width,
    40,
    "a 60 unit door cannot survive on a 40 unit wall",
  );
  assert.throws(
    () => walls.moveWallVertex(wall, 3, { x: 0, y: 0 }),
    RangeError,
  );
});
