import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/rooms/indoor-geometry.ts", import.meta.url),
  "utf8",
);
const directory = await mkdtemp(join(tmpdir(), "coursemap-indoor-geometry-"));
const target = join(directory, "indoor-geometry.js");
await writeFile(
  target,
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
);
const {
  boundsOfPoints,
  closestPointOnIndoorGeometryBoundary,
  indoorGeometryBounds,
  indoorGeometryCentre,
  isIndoorPointWithinPolygon,
  isIndoorRingWithinPolygon,
  isIndoorSegmentWithinPolygon,
  moveIndoorGeometryVertex,
  pointInIndoorGeometry,
  resizeIndoorGeometryToBounds,
  translateIndoorGeometry,
} = await import(pathToFileURL(target).href);

const rectangle = {
  type: "rectangle",
  x: 10,
  y: 20,
  width: 40,
  height: 30,
  cornerRadius: 0,
};
const ellipse = { type: "ellipse", cx: 100, cy: 100, rx: 20, ry: 10 };
/** An L-shape: concave, so its centroid and its vertex average differ. */
const lShape = {
  type: "polygon",
  points: [
    { x: 0, y: 0 },
    { x: 60, y: 0 },
    { x: 60, y: 20 },
    { x: 20, y: 20 },
    { x: 20, y: 60 },
    { x: 0, y: 60 },
  ],
};

test("snaps room entrances to rectangle and ellipse boundaries", () => {
  assert.deepEqual(
    closestPointOnIndoorGeometryBoundary(
      {
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        cornerRadius: 0,
      },
      { x: 210, y: 170 },
    ),
    { x: 210, y: 200 },
  );

  assert.deepEqual(
    closestPointOnIndoorGeometryBoundary(
      { type: "ellipse", cx: 200, cy: 200, rx: 100, ry: 50 },
      { x: 200, y: 200 },
    ),
    { x: 300, y: 200 },
  );
});

test("snaps polygon room entrances to the closest wall segment", () => {
  assert.deepEqual(
    closestPointOnIndoorGeometryBoundary(
      {
        type: "polygon",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      },
      { x: 80, y: 120 },
    ),
    { x: 80, y: 100 },
  );
});

test("takes the area weighted centroid of a polygon", () => {
  assert.deepEqual(indoorGeometryCentre(rectangle), { x: 30, y: 35 });
  assert.deepEqual(indoorGeometryCentre(ellipse), { x: 100, y: 100 });

  // Area weighted: a 60x20 arm centred on (30, 10) plus a 20x40 arm centred on
  // (10, 40). The vertex average would be (26.67, 26.67), further out again.
  assert.deepEqual(indoorGeometryCentre(lShape), { x: 22, y: 22 });
});

test("ignores a repeated closing point when centring a polygon", () => {
  const closed = {
    type: "polygon",
    points: [...lShape.points, { ...lShape.points[0] }],
  };
  assert.deepEqual(indoorGeometryCentre(closed), indoorGeometryCentre(lShape));
});

test("reports axis aligned bounds for every geometry", () => {
  assert.deepEqual(indoorGeometryBounds(rectangle), {
    minX: 10,
    minY: 20,
    maxX: 50,
    maxY: 50,
  });
  assert.deepEqual(indoorGeometryBounds(ellipse), {
    minX: 80,
    minY: 90,
    maxX: 120,
    maxY: 110,
  });
  assert.deepEqual(indoorGeometryBounds(lShape), {
    minX: 0,
    minY: 0,
    maxX: 60,
    maxY: 60,
  });
  assert.throws(() => boundsOfPoints([]), RangeError);
});

test("translating a geometry moves its bounds and nothing else", () => {
  const moved = translateIndoorGeometry(rectangle, { x: 5, y: -5 });
  assert.deepEqual(indoorGeometryBounds(moved), {
    minX: 15,
    minY: 15,
    maxX: 55,
    maxY: 45,
  });
  assert.equal(moved.cornerRadius, rectangle.cornerRadius);

  assert.deepEqual(translateIndoorGeometry(ellipse, { x: 1, y: 2 }), {
    type: "ellipse",
    cx: 101,
    cy: 102,
    rx: 20,
    ry: 10,
  });
  assert.deepEqual(
    translateIndoorGeometry(lShape, { x: 10, y: 10 }).points[0],
    { x: 10, y: 10 },
  );
});

test("resizes every geometry into a requested extent", () => {
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 200 };
  for (const geometry of [rectangle, ellipse, lShape]) {
    assert.deepEqual(
      indoorGeometryBounds(resizeIndoorGeometryToBounds(geometry, bounds)),
      bounds,
      `${geometry.type} must land exactly in the requested bounds`,
    );
  }
});

test("resizing a degenerate polygon axis centres rather than dividing by zero", () => {
  const line = {
    type: "polygon",
    points: [
      { x: 5, y: 0 },
      { x: 5, y: 10 },
      { x: 5, y: 20 },
    ],
  };
  const resized = resizeIndoorGeometryToBounds(line, {
    minX: 0,
    minY: 0,
    maxX: 40,
    maxY: 40,
  });
  assert.ok(resized.points.every((point) => Number.isFinite(point.x)));
  assert.ok(resized.points.every((point) => point.x === 20));
});

test("moves a single polygon vertex and rejects one that does not exist", () => {
  const moved = moveIndoorGeometryVertex(lShape, 2, { x: 80, y: 25 });
  assert.deepEqual(moved.points[2], { x: 80, y: 25 });
  assert.deepEqual(moved.points[1], lShape.points[1]);
  assert.deepEqual(
    lShape.points[2],
    { x: 60, y: 20 },
    "the input is unchanged",
  );

  assert.throws(
    () => moveIndoorGeometryVertex(lShape, 6, { x: 0, y: 0 }),
    RangeError,
  );
  assert.throws(
    () => moveIndoorGeometryVertex(lShape, -1, { x: 0, y: 0 }),
    RangeError,
  );
});

test("tests containment for rectangles, ellipses and concave polygons", () => {
  assert.equal(pointInIndoorGeometry(rectangle, { x: 30, y: 35 }), true);
  assert.equal(pointInIndoorGeometry(rectangle, { x: 9, y: 35 }), false);

  assert.equal(pointInIndoorGeometry(ellipse, { x: 100, y: 105 }), true);
  assert.equal(pointInIndoorGeometry(ellipse, { x: 119, y: 109 }), false);

  assert.equal(pointInIndoorGeometry(lShape, { x: 10, y: 10 }), true);
  assert.equal(
    pointInIndoorGeometry(lShape, { x: 50, y: 50 }),
    false,
    "the notch of an L-shaped room is outside it",
  );
});

test("tests complete segments against concave footprints and holes", () => {
  const exterior = lShape.points;
  const hole = [
    { x: 5, y: 5 },
    { x: 15, y: 5 },
    { x: 15, y: 15 },
    { x: 5, y: 15 },
  ];

  assert.equal(
    isIndoorPointWithinPolygon({ x: 0, y: 30 }, exterior),
    true,
    "the usable outer boundary counts as contained",
  );
  assert.equal(
    isIndoorPointWithinPolygon({ x: 5, y: 10 }, exterior, [hole]),
    false,
    "a void boundary is unavailable floor area",
  );
  assert.equal(
    isIndoorSegmentWithinPolygon({ x: 10, y: 50 }, { x: 50, y: 10 }, exterior),
    false,
    "inside endpoints do not make a segment that bridges the notch valid",
  );
  assert.equal(
    isIndoorSegmentWithinPolygon({ x: 5, y: 30 }, { x: 15, y: 30 }, exterior),
    true,
  );
  assert.equal(
    isIndoorRingWithinPolygon(
      [
        { x: 2, y: 2 },
        { x: 18, y: 2 },
        { x: 18, y: 18 },
        { x: 2, y: 18 },
      ],
      exterior,
      [hole],
    ),
    false,
    "a ring cannot surround a footprint hole",
  );
});
