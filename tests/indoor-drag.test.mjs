import assert from "node:assert/strict";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const { "indoor-drag": drag, "indoor-draft": draft } = await loadLibModules(
  ["rooms/indoor-drag", "rooms/indoor-draft"],
  "indoor-drag",
);

const footprint = {
  viewBox: { width: 100, height: 100 },
  reference: {
    west: 149,
    north: -35,
    latitude: -35,
    offsetX: 0,
    offsetY: 0,
  },
  outline: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ],
  polygons: [
    {
      exterior: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      holes: [],
    },
  ],
  dimensionsMetres: { width: 10, height: 10 },
  metresPerUnit: 0.1,
};

const start = { minX: 100, minY: 100, maxX: 200, maxY: 150 };

test("each handle moves only the sides it sits on", () => {
  assert.deepEqual(drag.resizeBounds(start, "east", { x: 260, y: 999 }), {
    ...start,
    maxX: 260,
  });
  assert.deepEqual(drag.resizeBounds(start, "north", { x: 999, y: 60 }), {
    ...start,
    minY: 60,
  });
  assert.deepEqual(drag.resizeBounds(start, "south-east", { x: 260, y: 200 }), {
    minX: 100,
    minY: 100,
    maxX: 260,
    maxY: 200,
  });
  assert.deepEqual(drag.resizeBounds(start, "north-west", { x: 40, y: 20 }), {
    minX: 40,
    minY: 20,
    maxX: 200,
    maxY: 150,
  });
  assert.equal(drag.INDOOR_HANDLE_IDS.length, 8);
});

test("dragging a side past its opposite flips rather than inverting", () => {
  const flipped = drag.resizeBounds(start, "east", { x: 20, y: 0 });
  assert.ok(flipped.maxX > flipped.minX);
  assert.deepEqual(flipped, { minX: 20, minY: 100, maxX: 100, maxY: 150 });
});

test("holding the aspect ratio keeps a corner drag proportional", () => {
  const locked = drag.resizeBounds(
    start,
    "south-east",
    { x: 300, y: 130 },
    true,
  );
  const width = locked.maxX - locked.minX;
  const height = locked.maxY - locked.minY;
  assert.ok(Math.abs(width / height - 2) < 1e-9, "the two to one ratio holds");
  assert.equal(locked.minX, 100);
  assert.equal(locked.minY, 100);
});

test("a rectangle smaller than a metre is not created", () => {
  const tiny = {
    kind: "draw-rect",
    tool: "rectangle",
    origin: { x: 0, y: 0 },
    current: { x: 4, y: 40 },
  };
  assert.equal(drag.drawnRectangleBounds(tiny), null);

  const zero = {
    kind: "draw-rect",
    tool: "rectangle",
    origin: { x: 10, y: 10 },
    current: { x: 10, y: 10 },
  };
  assert.equal(drag.drawnRectangleBounds(zero), null);

  const real = {
    kind: "draw-rect",
    tool: "rectangle",
    origin: { x: 60, y: 80 },
    current: { x: 10, y: 10 },
  };
  assert.deepEqual(drag.drawnRectangleBounds(real), {
    minX: 10,
    minY: 10,
    maxX: 60,
    maxY: 80,
  });
  assert.equal(drag.drawnRectangleBounds(drag.IDLE_DRAG), null);
});

test("a multi-point draw needs enough points to make anything", () => {
  const one = drag.appendDrawPoint(drag.IDLE_DRAG, "wall", { x: 0, y: 0 });
  assert.equal(drag.drawnPoints(one), null);

  const two = drag.appendDrawPoint(one, "wall", { x: 100, y: 0 });
  assert.equal(drag.drawnPoints(two).length, 2);

  const polygonTwo = drag.appendDrawPoint(
    drag.appendDrawPoint(drag.IDLE_DRAG, "polygon", { x: 0, y: 0 }),
    "polygon",
    { x: 100, y: 0 },
  );
  assert.equal(
    drag.drawnPoints(polygonTwo),
    null,
    "a polygon needs three points",
  );
  assert.equal(
    drag.drawnPoints(
      drag.appendDrawPoint(polygonTwo, "polygon", { x: 50, y: 80 }),
    ).length,
    3,
  );
});

test("switching tool mid-draw restarts the gesture", () => {
  const wall = drag.appendDrawPoint(drag.IDLE_DRAG, "wall", { x: 0, y: 0 });
  const path = drag.appendDrawPoint(wall, "path", { x: 50, y: 50 });
  assert.equal(path.tool, "path");
  assert.deepEqual(path.points, [{ x: 50, y: 50 }]);
});

test("a repeated click on the point just placed is ignored", () => {
  const once = drag.appendDrawPoint(drag.IDLE_DRAG, "wall", { x: 10, y: 10 });
  const twice = drag.appendDrawPoint(once, "wall", { x: 10, y: 10 });
  assert.equal(twice.points.length, 1);
});

test("backspace drops the last point and clears the gesture at zero", () => {
  const two = drag.appendDrawPoint(
    drag.appendDrawPoint(drag.IDLE_DRAG, "wall", { x: 0, y: 0 }),
    "wall",
    { x: 100, y: 0 },
  );
  const one = drag.dropLastDrawPoint(two);
  assert.equal(one.points.length, 1);
  assert.deepEqual(drag.dropLastDrawPoint(one), drag.IDLE_DRAG);
});

test("the move delta is the distance travelled, and zero for anything else", () => {
  assert.deepEqual(
    drag.dragDelta({
      kind: "move",
      targetId: "room",
      origin: { x: 10, y: 10 },
      current: { x: 40, y: 4 },
    }),
    { x: 30, y: -6 },
  );
  assert.deepEqual(drag.dragDelta(drag.IDLE_DRAG), { x: 0, y: 0 });
});

test("a preview point does not become a placed point", () => {
  const previewed = drag.previewDrawPoint(
    drag.appendDrawPoint(drag.IDLE_DRAG, "wall", { x: 0, y: 0 }),
    { x: 90, y: 90 },
  );
  assert.deepEqual(previewed.preview, { x: 90, y: 90 });
  assert.equal(previewed.points.length, 1);
  assert.deepEqual(
    drag.previewDrawPoint(drag.IDLE_DRAG, { x: 1, y: 1 }),
    drag.IDLE_DRAG,
  );
});

test("a rectangle draft projects its live area and current corner", () => {
  const collection = draft.buildIndoorDraftGeoJson(
    {
      kind: "draw-rect",
      tool: "corridor",
      origin: { x: 20, y: 25 },
      current: { x: 80, y: 75 },
    },
    footprint,
  );

  const area = collection.features.find(
    (feature) => feature.properties.draftKind === "area",
  );
  assert.equal(area.geometry.type, "Polygon");
  assert.equal(area.geometry.coordinates[0].length, 5, "the ring is closed");
  assert.equal(area.properties.tool, "corridor");
  assert.equal(area.properties.colour, "#2563eb");

  const vertices = collection.features.filter(
    (feature) => feature.properties.draftKind === "vertex",
  );
  assert.equal(vertices.length, 2);
  assert.equal(vertices[0].properties.preview, false);
  assert.equal(vertices[1].properties.preview, true);
});

test("multi-point drafts include the pointer preview without committing it", () => {
  const collection = draft.buildIndoorDraftGeoJson(
    {
      kind: "draw-points",
      tool: "wall",
      points: [
        { x: 20, y: 20 },
        { x: 50, y: 20 },
      ],
      preview: { x: 80, y: 45 },
    },
    footprint,
  );

  const stroke = collection.features.find(
    (feature) => feature.properties.draftKind === "stroke",
  );
  assert.equal(stroke.geometry.type, "LineString");
  assert.equal(stroke.geometry.coordinates.length, 3);
  assert.equal(
    collection.features.filter(
      (feature) =>
        feature.properties.draftKind === "vertex" && feature.properties.preview,
    ).length,
    1,
  );
});

test("a shaped-room draft fills only after it has a valid closed ring", () => {
  const collection = draft.buildIndoorDraftGeoJson(
    {
      kind: "draw-points",
      tool: "polygon",
      points: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
      ],
      preview: { x: 50, y: 70 },
    },
    footprint,
  );

  assert.equal(collection.features[0].geometry.type, "Polygon");
  assert.equal(collection.features[0].properties.draftKind, "area");
  assert.equal(collection.features[0].geometry.coordinates[0].length, 4);
});

test("draft geometry never crosses outside the building or through a void", () => {
  const footprintWithVoid = {
    ...footprint,
    polygons: [
      {
        exterior: footprint.outline,
        holes: [
          [
            { x: 40, y: 40 },
            { x: 60, y: 40 },
            { x: 60, y: 60 },
            { x: 40, y: 60 },
          ],
        ],
      },
    ],
  };
  const crossingPath = draft.buildIndoorDraftGeoJson(
    {
      kind: "draw-points",
      tool: "path",
      points: [{ x: 20, y: 50 }],
      preview: { x: 80, y: 50 },
    },
    footprintWithVoid,
  );
  assert.equal(
    crossingPath.features.some(
      (feature) => feature.properties.draftKind === "stroke",
    ),
    false,
  );
  assert.equal(
    crossingPath.features.filter(
      (feature) => feature.properties.draftKind === "vertex",
    ).length,
    1,
    "the invalid current preview is omitted",
  );

  const outsideRectangle = draft.buildIndoorDraftGeoJson(
    {
      kind: "draw-rect",
      tool: "rectangle",
      origin: { x: 20, y: 20 },
      current: { x: 120, y: 80 },
    },
    footprint,
  );
  assert.equal(
    outsideRectangle.features.some(
      (feature) => feature.properties.draftKind === "area",
    ),
    false,
  );
  assert.equal(
    outsideRectangle.features.some((feature) => feature.properties.preview),
    false,
  );
});

test("a handle starts its gesture where the handle already sits", () => {
  const bounds = { minX: 100, minY: 100, maxX: 200, maxY: 150 };
  assert.deepEqual(drag.handlePoint(bounds, "north-west"), { x: 100, y: 100 });
  assert.deepEqual(drag.handlePoint(bounds, "south-east"), { x: 200, y: 150 });
  assert.deepEqual(drag.handlePoint(bounds, "north"), { x: 150, y: 100 });
  assert.deepEqual(drag.handlePoint(bounds, "west"), { x: 100, y: 125 });

  // Pressing a handle and releasing without moving must leave the extent alone,
  // rather than collapsing the shape onto the origin.
  for (const handle of drag.INDOOR_HANDLE_IDS) {
    assert.deepEqual(
      drag.resizeBounds(bounds, handle, drag.handlePoint(bounds, handle)),
      bounds,
      `${handle} must be a no-op without a drag`,
    );
  }
});
