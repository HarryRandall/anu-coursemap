import assert from "node:assert/strict";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const { "indoor-editor-state": editor } = await loadLibModules(
  ["rooms/indoor-editor-state"],
  "indoor-editor-state",
);

const groundOutline = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 300 },
  { x: 0, y: 300 },
];

const baseDocument = {
  version: 2,
  viewBox: { width: 400, height: 300 },
  levels: [
    {
      id: "level-ground",
      number: 0,
      ref: "G",
      name: "Ground floor",
      elevationMetres: 0,
      heightMetres: 3.6,
      outline: groundOutline,
    },
    {
      id: "level-one",
      number: 1,
      ref: "1",
      name: "Level 1",
      elevationMetres: 3.6,
      heightMetres: 3.6,
      outline: groundOutline,
    },
  ],
  walls: [
    {
      id: "wall-ground",
      levelId: "level-ground",
      kind: "structural",
      points: [
        { x: 10, y: 10 },
        { x: 390, y: 10 },
      ],
      thickness: 2,
      closed: false,
      openings: [
        {
          id: "door-1",
          kind: "door",
          segmentIndex: 0,
          offset: 0.5,
          width: 9,
          accessibility: "accessible",
          spaceId: "room-g01",
        },
      ],
    },
  ],
  spaces: [
    {
      id: "room-g01",
      levelId: "level-ground",
      kind: "room",
      ref: "G01",
      name: "Seminar room",
      searchable: true,
      geometry: {
        type: "rectangle",
        x: 20,
        y: 20,
        width: 100,
        height: 80,
        cornerRadius: 0,
      },
    },
    {
      id: "room-101",
      levelId: "level-one",
      kind: "room",
      ref: "1.01",
      name: "Studio",
      searchable: true,
      geometry: {
        type: "rectangle",
        x: 20,
        y: 20,
        width: 100,
        height: 80,
        cornerRadius: 0,
      },
    },
  ],
  connectors: [
    {
      id: "lift",
      kind: "lift",
      name: "Main lift",
      levelIds: ["level-ground", "level-one"],
      position: { x: 200, y: 150 },
      accessibility: "accessible",
    },
  ],
  routeNodes: [
    {
      id: "junction-ground",
      levelId: "level-ground",
      kind: "junction",
      position: { x: 200, y: 100 },
    },
    {
      id: "junction-one",
      levelId: "level-one",
      kind: "junction",
      position: { x: 200, y: 100 },
    },
  ],
  routeEdges: [],
};

function initial() {
  return editor.createIndoorEditorState(baseDocument, "Demo indoor map");
}

function apply(state, ...actions) {
  return actions.reduce(editor.indoorEditorReducer, state);
}

test("starts clean on the first level with nothing selected", () => {
  const state = initial();
  assert.equal(state.levelId, "level-ground");
  assert.equal(state.dirty, false);
  assert.equal(state.selection, null);
  assert.deepEqual(state.past, []);
});

test("adding a floor gives it the same real perimeter", () => {
  const state = apply(initial(), { type: "level/add" });
  const level = state.document.levels.at(-1);
  const perimeter = state.document.walls.find(
    (wall) => wall.id === `wall-outline-${level.id}`,
  );

  assert.equal(level.name, "Level 2");
  assert.deepEqual(level.outline, groundOutline);
  assert.ok(perimeter);
  assert.equal(perimeter.closed, true);
  assert.equal(perimeter.kind, "structural");
  assert.deepEqual(perimeter.points, groundOutline);
  assert.notStrictEqual(perimeter.points, level.outline);
});

test("removing a level cascades to everything that belonged to it", () => {
  const state = apply(initial(), {
    type: "level/remove",
    levelId: "level-ground",
  });

  assert.deepEqual(
    state.document.levels.map((level) => level.id),
    ["level-one"],
  );
  assert.deepEqual(state.document.walls, []);
  assert.deepEqual(
    state.document.spaces.map((space) => space.id),
    ["room-101"],
  );
  assert.deepEqual(
    state.document.routeNodes.map((node) => node.id),
    ["junction-one"],
  );
  assert.deepEqual(state.document.connectors[0].levelIds, ["level-one"]);
  assert.equal(state.levelId, "level-one", "the editor moves to a live level");
});

test("a connector left serving no levels is removed with its last level", () => {
  const state = apply(
    initial(),
    { type: "level/remove", levelId: "level-ground" },
    { type: "level/remove", levelId: "level-one" },
  );
  assert.deepEqual(state.document.connectors, []);
  assert.equal(state.levelId, "");
});

test("deleting a room clears the openings that served it rather than dangling", () => {
  const state = apply(
    initial(),
    { type: "select", selection: { kind: "space", id: "room-g01" } },
    { type: "delete" },
  );

  assert.equal(
    state.document.spaces.some((space) => space.id === "room-g01"),
    false,
  );
  assert.equal(state.document.walls[0].openings[0].spaceId, undefined);
  assert.equal(state.selection, null);
});

test("moving and resizing a room go through the shared geometry helpers", () => {
  const moved = apply(initial(), {
    type: "space/translate",
    id: "room-g01",
    delta: { x: 10, y: -5 },
  });
  assert.deepEqual(moved.document.spaces[0].geometry, {
    type: "rectangle",
    x: 30,
    y: 15,
    width: 100,
    height: 80,
    cornerRadius: 0,
  });

  const resized = apply(initial(), {
    type: "space/resize",
    id: "room-g01",
    bounds: { minX: 0, minY: 0, maxX: 50, maxY: 25 },
  });
  assert.deepEqual(resized.document.spaces[0].geometry, {
    type: "rectangle",
    x: 0,
    y: 0,
    width: 50,
    height: 25,
    cornerRadius: 0,
  });
});

test("rejects room, wall and connector edits outside the floor outline", () => {
  const start = initial();
  const outsideRoom = {
    ...baseDocument.spaces[0],
    id: "outside-room",
    geometry: {
      type: "rectangle",
      x: 390,
      y: 20,
      width: 40,
      height: 40,
      cornerRadius: 0,
    },
  };
  const actions = [
    { type: "space/add", space: outsideRoom },
    {
      type: "space/translate",
      id: "room-g01",
      delta: { x: 400, y: 0 },
    },
    {
      type: "space/resize",
      id: "room-g01",
      bounds: { minX: -10, minY: 0, maxX: 50, maxY: 50 },
    },
    {
      type: "wall/vertex/move",
      id: "wall-ground",
      index: 0,
      point: { x: -10, y: 10 },
    },
    {
      type: "connector/translate",
      id: "lift",
      delta: { x: 300, y: 0 },
    },
  ];

  for (const action of actions) {
    assert.strictEqual(
      editor.indoorEditorReducer(start, action),
      start,
      `${action.type} must leave state and history untouched`,
    );
  }
});

test("rejects a wall that bridges a concave floor notch", () => {
  const outline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 30 },
    { x: 30, y: 30 },
    { x: 30, y: 100 },
    { x: 0, y: 100 },
  ];
  const document = {
    ...baseDocument,
    levels: [{ ...baseDocument.levels[0], outline }],
    walls: [],
    spaces: [],
    connectors: [],
    routeNodes: [],
  };
  const start = editor.createIndoorEditorState(document, "Concave plan");
  const next = editor.indoorEditorReducer(start, {
    type: "wall/add",
    wall: {
      id: "notch-bridge",
      levelId: "level-ground",
      kind: "partition",
      points: [
        { x: 15, y: 80 },
        { x: 80, y: 15 },
      ],
      thickness: 1,
      closed: false,
      openings: [],
    },
  });

  assert.strictEqual(next, start);
});

test("rejects removing a wall vertex when the replacement bridges a notch", () => {
  const outline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 30 },
    { x: 30, y: 30 },
    { x: 30, y: 100 },
    { x: 0, y: 100 },
  ];
  const document = {
    ...baseDocument,
    levels: [{ ...baseDocument.levels[0], outline }],
    walls: [
      {
        id: "notch-corner",
        levelId: "level-ground",
        kind: "partition",
        points: [
          { x: 15, y: 80 },
          { x: 15, y: 15 },
          { x: 80, y: 15 },
        ],
        thickness: 1,
        closed: false,
        openings: [],
      },
    ],
    spaces: [],
    connectors: [],
    routeNodes: [],
  };
  const start = editor.createIndoorEditorState(document, "Concave plan");

  assert.strictEqual(
    editor.indoorEditorReducer(start, {
      type: "wall/vertex/remove",
      id: "notch-corner",
      index: 1,
    }),
    start,
  );
});

test("keeps the generated vector perimeter immutable", () => {
  const withPerimeter = apply(initial(), { type: "level/add" });
  const perimeter = withPerimeter.document.walls.at(-1);
  const selected = apply(withPerimeter, {
    type: "select",
    selection: { kind: "wall", id: perimeter.id },
  });

  assert.strictEqual(
    editor.indoorEditorReducer(selected, {
      type: "wall/update",
      id: perimeter.id,
      patch: { kind: "partition", thickness: 100 },
    }),
    selected,
  );
  assert.strictEqual(
    editor.indoorEditorReducer(selected, { type: "delete" }),
    selected,
  );
});

test("uses the complete footprint for annexes and courtyards", () => {
  const main = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const courtyard = [
    { x: 40, y: 40 },
    { x: 60, y: 40 },
    { x: 60, y: 60 },
    { x: 40, y: 60 },
  ];
  const annex = [
    { x: 120, y: 0 },
    { x: 180, y: 0 },
    { x: 180, y: 100 },
    { x: 120, y: 100 },
  ];
  const projection = {
    viewBox: { width: 180, height: 100 },
    outline: main,
    polygons: [
      { exterior: main, holes: [courtyard] },
      { exterior: annex, holes: [] },
    ],
    dimensionsMetres: { width: 18, height: 10 },
    metresPerUnit: 0.1,
  };
  const document = {
    ...baseDocument,
    viewBox: projection.viewBox,
    levels: [{ ...baseDocument.levels[0], outline: main }],
    walls: [],
    spaces: [],
    connectors: [],
    routeNodes: [],
  };
  const start = editor.createIndoorEditorState(
    document,
    "Multi-part plan",
    projection,
  );
  const annexRoom = {
    ...baseDocument.spaces[0],
    id: "annex-room",
    geometry: {
      type: "rectangle",
      x: 130,
      y: 20,
      width: 20,
      height: 20,
      cornerRadius: 0,
    },
  };
  const accepted = editor.indoorEditorReducer(start, {
    type: "space/add",
    space: annexRoom,
  });
  assert.equal(accepted.document.spaces.at(-1).id, "annex-room");

  const courtyardRoom = {
    ...annexRoom,
    id: "courtyard-room",
    geometry: { ...annexRoom.geometry, x: 45, y: 45, width: 10, height: 10 },
  };
  assert.strictEqual(
    editor.indoorEditorReducer(start, {
      type: "space/add",
      space: courtyardRoom,
    }),
    start,
  );
});

test("restores the real outline after removing and re-adding the last floor", () => {
  const outline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 30 },
    { x: 30, y: 30 },
    { x: 30, y: 100 },
    { x: 0, y: 100 },
  ];
  const projection = {
    viewBox: { width: 100, height: 100 },
    outline,
    polygons: [{ exterior: outline, holes: [] }],
    dimensionsMetres: { width: 10, height: 10 },
    metresPerUnit: 0.1,
  };
  const document = {
    ...baseDocument,
    viewBox: projection.viewBox,
    levels: [{ ...baseDocument.levels[0], outline }],
    walls: [],
    spaces: [],
    connectors: [],
    routeNodes: [],
  };
  const start = editor.createIndoorEditorState(
    document,
    "Concave plan",
    projection,
  );
  const restored = apply(
    start,
    { type: "level/remove", levelId: "level-ground" },
    { type: "level/add" },
  );

  assert.deepEqual(restored.document.levels[0].outline, outline);
  assert.deepEqual(restored.document.walls[0].points, outline);
  assert.notDeepEqual(restored.document.levels[0].outline, [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
});

test("undo and redo walk the whole document, including the map name", () => {
  const edited = apply(
    initial(),
    { type: "space/translate", id: "room-g01", delta: { x: 10, y: 0 } },
    { type: "map/rename", name: "Renamed" },
  );
  assert.equal(edited.name, "Renamed");

  const undoneOnce = apply(edited, { type: "undo" });
  assert.equal(undoneOnce.name, "Demo indoor map");
  assert.equal(undoneOnce.document.spaces[0].geometry.x, 30);

  const undoneTwice = apply(undoneOnce, { type: "undo" });
  assert.equal(undoneTwice.document.spaces[0].geometry.x, 20);

  const redone = apply(undoneTwice, { type: "redo" }, { type: "redo" });
  assert.equal(redone.name, "Renamed");
  assert.equal(redone.document.spaces[0].geometry.x, 30);

  assert.equal(apply(initial(), { type: "undo" }).past.length, 0);
});

test("consecutive edits to one field collapse into a single undo entry", () => {
  const typed = apply(
    initial(),
    { type: "space/update", id: "room-g01", patch: { name: "S" } },
    { type: "space/update", id: "room-g01", patch: { name: "Se" } },
    { type: "space/update", id: "room-g01", patch: { name: "Sem" } },
  );
  assert.equal(typed.past.length, 1);
  assert.equal(
    apply(typed, { type: "undo" }).document.spaces[0].name,
    "Seminar room",
  );

  // A different field starts a new entry.
  const thenOther = apply(typed, {
    type: "space/update",
    id: "room-101",
    patch: { name: "X" },
  });
  assert.equal(thenOther.past.length, 2);
});

test("selecting something breaks the coalescing run", () => {
  const state = apply(
    initial(),
    { type: "space/update", id: "room-g01", patch: { name: "A" } },
    { type: "select", selection: { kind: "space", id: "room-g01" } },
    { type: "space/update", id: "room-g01", patch: { name: "B" } },
  );
  assert.equal(state.past.length, 2);
});

test("history is capped so a long session cannot grow without bound", () => {
  let state = initial();
  for (let index = 0; index < 80; index += 1) {
    state = editor.indoorEditorReducer(state, {
      type: "space/translate",
      id: "room-g01",
      delta: { x: 1, y: 0 },
    });
  }
  assert.equal(state.past.length, 50);
});

test("the routing signature ignores names and reacts to geometry", () => {
  const start = initial();
  const before = editor.routingSignature(start.document);

  const renamed = apply(
    start,
    { type: "space/update", id: "room-g01", patch: { name: "Totally new" } },
    { type: "map/rename", name: "Another name" },
    { type: "level/update", levelId: "level-ground", patch: { name: "Lower" } },
  );
  assert.equal(
    editor.routingSignature(renamed.document),
    before,
    "renaming must not rebuild the route graph",
  );

  const moved = apply(start, {
    type: "space/translate",
    id: "room-g01",
    delta: { x: 1, y: 0 },
  });
  assert.notEqual(editor.routingSignature(moved.document), before);

  const widened = apply(start, {
    type: "opening/update",
    id: "door-1",
    patch: { width: 12 },
  });
  assert.notEqual(editor.routingSignature(widened.document), before);
});

test("wall vertex edits run through the wall helpers and keep openings valid", () => {
  const state = apply(initial(), {
    type: "wall/vertex/insert",
    id: "wall-ground",
    segmentIndex: 0,
    point: { x: 200, y: 10 },
  });
  assert.equal(state.document.walls[0].points.length, 3);
  assert.equal(state.document.walls[0].openings.length, 1);

  const translated = apply(initial(), {
    type: "wall/translate",
    id: "wall-ground",
    delta: { x: 0, y: 5 },
  });
  assert.deepEqual(translated.document.walls[0].points[0], { x: 10, y: 15 });
});

test("saving clears the dirty flag without touching history", () => {
  const edited = apply(initial(), {
    type: "space/translate",
    id: "room-g01",
    delta: { x: 5, y: 0 },
  });
  assert.equal(edited.dirty, true);

  const saved = apply(edited, {
    type: "saved",
    document: edited.document,
    name: edited.name,
    sourceDocument: edited.document,
    sourceName: edited.name,
  });
  assert.equal(saved.dirty, false);
  assert.equal(saved.past.length, edited.past.length);
});

test("a completed save does not overwrite edits made while it was in flight", () => {
  const saving = apply(initial(), {
    type: "space/translate",
    id: "room-g01",
    delta: { x: 5, y: 0 },
  });
  const latest = apply(
    saving,
    {
      type: "space/update",
      id: "room-g01",
      patch: { name: "Edited while saving" },
    },
    { type: "map/rename", name: "Latest map name" },
  );
  const serverDocument = {
    ...saving.document,
    generatedAt: "2026-08-28T00:00:00.000Z",
  };

  const completed = apply(latest, {
    type: "saved",
    document: serverDocument,
    name: saving.name,
    sourceDocument: saving.document,
    sourceName: saving.name,
  });

  assert.strictEqual(completed.document, latest.document);
  assert.equal(completed.name, "Latest map name");
  assert.equal(completed.dirty, true);
  assert.equal(completed.past.length, latest.past.length);
});

test("level content bounds cover the outline and everything drawn on it", () => {
  const bounds = editor.levelContentBounds(baseDocument, "level-ground");
  assert.deepEqual(bounds, { minX: 0, minY: 0, maxX: 400, maxY: 300 });
  assert.equal(editor.levelContentBounds(baseDocument, "missing"), null);
});
