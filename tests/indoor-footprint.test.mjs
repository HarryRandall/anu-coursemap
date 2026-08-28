import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const modules = await loadLibModules(
  [
    "rooms/indoor-footprint",
    "rooms/indoor-geometry",
    "rooms/indoor-map-migrate",
  ],
  "footprint",
);
const footprint = modules["indoor-footprint"];
const indoorGeometry = modules["indoor-geometry"];
const indoorMapMigrate = modules["indoor-map-migrate"];
const {
  createIndoorDocumentForFootprint,
  isIndoorDocumentWithinFootprint,
  projectBuildingFootprint,
  remapIndoorDocumentToFootprint,
} = footprint;

function footprintPolygon(projection) {
  return {
    exterior: projection.outline,
    holes:
      projection.polygons.find(
        (polygon) => polygon.exterior === projection.outline,
      )?.holes ?? [],
  };
}

function assertDocumentContentContained(document, projection) {
  assert.equal(
    isIndoorDocumentWithinFootprint(document, projection),
    true,
    "the complete document must pass the save boundary guard",
  );
  const polygon = footprintPolygon(projection);
  for (const space of document.spaces) {
    assert.equal(
      indoorGeometry.isIndoorRingWithinPolygon(
        indoorGeometry.indoorGeometryRing(space.geometry),
        polygon.exterior,
        polygon.holes,
      ),
      true,
      `${space.name} must stay wholly inside the footprint`,
    );
  }
  for (const wall of document.walls) {
    if (wall.id === `wall-outline-${wall.levelId}`) continue;
    const count = wall.closed ? wall.points.length : wall.points.length - 1;
    for (let index = 0; index < count; index += 1) {
      assert.equal(
        indoorGeometry.isIndoorSegmentWithinPolygon(
          wall.points[index],
          wall.points[(index + 1) % wall.points.length],
          polygon.exterior,
          polygon.holes,
        ),
        true,
        `${wall.id} segment ${index} must stay inside the footprint`,
      );
    }
  }
  for (const connector of document.connectors) {
    const { x, y } = connector.position;
    assert.equal(
      indoorGeometry.isIndoorRingWithinPolygon(
        [
          { x: x - 12, y: y - 12 },
          { x: x + 12, y: y - 12 },
          { x: x + 12, y: y + 12 },
          { x: x - 12, y: y + 12 },
        ],
        polygon.exterior,
        polygon.holes,
      ),
      true,
      `${connector.name} shaft must stay inside the footprint`,
    );
  }
  for (const node of document.routeNodes) {
    assert.equal(
      indoorGeometry.isIndoorPointWithinPolygon(
        node.position,
        polygon.exterior,
        polygon.holes,
      ),
      true,
      `${node.id} must stay inside the footprint`,
    );
  }
}

const earthRadiusMetres = 6_371_008.8;
const metresPerDegree = (2 * Math.PI * earthRadiusMetres) / 360;

function coordinateRectangle({
  longitude = 149.12,
  latitude = -35.28,
  widthMetres,
  heightMetres,
}) {
  const longitudeSpan =
    widthMetres / (metresPerDegree * Math.cos((latitude * Math.PI) / 180));
  const latitudeSpan = heightMetres / metresPerDegree;
  return [
    [longitude, latitude],
    [longitude + longitudeSpan, latitude],
    [longitude + longitudeSpan, latitude + latitudeSpan],
    [longitude, latitude + latitudeSpan],
    [longitude, latitude],
  ];
}

test("projects a north-up footprint at the indoor routing scale", () => {
  const result = projectBuildingFootprint({
    type: "Polygon",
    coordinates: [coordinateRectangle({ widthMetres: 20, heightMetres: 10 })],
  });

  assert.deepEqual(result.dimensionsMetres, { width: 20, height: 10 });
  assert.deepEqual(result.viewBox, { width: 320, height: 220 });
  assert.equal(result.metresPerUnit, 0.1);
  assert.equal(result.outline.length, 4);
  assert.ok(result.outline[2].y < result.outline[0].y);

  const projectedWidth =
    Math.max(...result.outline.map(({ x }) => x)) -
    Math.min(...result.outline.map(({ x }) => x));
  const projectedHeight =
    Math.max(...result.outline.map(({ y }) => y)) -
    Math.min(...result.outline.map(({ y }) => y));
  assert.ok(Math.abs(projectedWidth / projectedHeight - 2) < 0.001);
});

test("preserves multipolygon parts and holes while choosing the largest outline", () => {
  const large = coordinateRectangle({ widthMetres: 40, heightMetres: 30 });
  const hole = coordinateRectangle({
    longitude: large[0][0] + 0.00005,
    latitude: large[0][1] + 0.00005,
    widthMetres: 4,
    heightMetres: 4,
  });
  const small = coordinateRectangle({
    longitude: 149.1206,
    latitude: -35.28,
    widthMetres: 8,
    heightMetres: 8,
  });
  const geometry = {
    type: "MultiPolygon",
    coordinates: [[large, hole], [small]],
  };

  const result = projectBuildingFootprint(geometry, { paddingMetres: 4 });

  assert.equal(result.polygons.length, 2);
  assert.equal(result.polygons[0].holes.length, 1);
  assert.equal(result.polygons[0].exterior.length, 4);
  assert.equal(result.polygons[0].holes[0].length, 4);
  assert.strictEqual(result.outline, result.polygons[0].exterior);
  assert.deepEqual(
    result,
    projectBuildingFootprint(geometry, { paddingMetres: 4 }),
  );
});

test("rejects degenerate or unbounded footprint input", () => {
  assert.throws(
    () =>
      projectBuildingFootprint({
        type: "Polygon",
        coordinates: [
          [
            [149.12, -35.28],
            [149.12, -35.28],
            [149.12, -35.28],
            [149.12, -35.28],
          ],
        ],
      }),
    /three distinct points/u,
  );
  assert.throws(
    () =>
      projectBuildingFootprint(
        {
          type: "Polygon",
          coordinates: [
            coordinateRectangle({ widthMetres: 20, heightMetres: 10 }),
          ],
        },
        { paddingMetres: 101 },
      ),
    /between 0 and 100/u,
  );
});

test("creates a deterministic explicit document against the real footprint", () => {
  const projection = projectBuildingFootprint({
    type: "Polygon",
    coordinates: [coordinateRectangle({ widthMetres: 20, heightMetres: 10 })],
  });

  const document = createIndoorDocumentForFootprint(projection);

  assert.equal(document.version, 2);
  assert.deepEqual(document.viewBox, projection.viewBox);
  assert.deepEqual(document.levels, [
    {
      id: "level-ground",
      number: 0,
      ref: "G",
      name: "Ground floor",
      elevationMetres: 0,
      heightMetres: 3.6,
      outline: projection.outline,
    },
  ]);
  assert.deepEqual(document.walls, [
    {
      id: "wall-outline-level-ground",
      levelId: "level-ground",
      kind: "structural",
      points: projection.outline,
      thickness: 2,
      closed: true,
      openings: [],
    },
  ]);
  assert.notStrictEqual(document.walls[0].points, document.levels[0].outline);
  assert.deepEqual(document.spaces, []);
  assert.deepEqual(document.connectors, []);
  assert.deepEqual(document.routeNodes, []);
  assert.deepEqual(document.routeEdges, []);
  assert.notStrictEqual(document.levels[0].outline, projection.outline);
});

test("remaps editable geometry and route points into a replacement footprint", () => {
  const projection = {
    viewBox: { width: 400, height: 100 },
    outline: [
      { x: 20, y: 10 },
      { x: 380, y: 10 },
      { x: 360, y: 90 },
      { x: 20, y: 90 },
    ],
    polygons: [],
    dimensionsMetres: { width: 36, height: 8 },
    metresPerUnit: 0.1,
  };
  const document = {
    version: 2,
    viewBox: { width: 1000, height: 500 },
    levels: [
      {
        id: "level-ground",
        number: 0,
        ref: "G",
        name: "Ground floor",
        elevationMetres: 0,
        heightMetres: 3.6,
        outline: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 500 },
          { x: 0, y: 500 },
        ],
      },
      {
        id: "level-one",
        number: 1,
        ref: "1",
        name: "Level 1",
        elevationMetres: 3.6,
        heightMetres: 3.6,
        outline: [
          { x: 100, y: 100 },
          { x: 900, y: 100 },
          { x: 900, y: 400 },
          { x: 100, y: 400 },
        ],
      },
    ],
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 500 },
          { x: 0, y: 500 },
        ],
        thickness: 2,
        closed: true,
        openings: [
          {
            id: "front-door",
            kind: "door",
            segmentIndex: 3,
            offset: 0.5,
            width: 20,
            accessibility: "accessible",
            exterior: true,
          },
        ],
      },
      {
        id: "partition-ground",
        levelId: "level-ground",
        kind: "partition",
        points: [
          { x: 100, y: 250 },
          { x: 900, y: 250 },
        ],
        thickness: 1.5,
        closed: false,
        openings: [],
      },
    ],
    spaces: [
      {
        id: "rectangle",
        levelId: "level-ground",
        kind: "room",
        ref: "G01",
        name: "Rectangle room",
        searchable: true,
        geometry: {
          type: "rectangle",
          x: 100,
          y: 50,
          width: 200,
          height: 100,
          cornerRadius: 20,
        },
      },
      {
        id: "ellipse",
        levelId: "level-ground",
        kind: "room",
        ref: "G02",
        name: "Ellipse room",
        searchable: true,
        geometry: { type: "ellipse", cx: 500, cy: 250, rx: 100, ry: 50 },
      },
      {
        id: "polygon",
        levelId: "level-one",
        kind: "corridor",
        ref: "",
        name: "Hallway",
        searchable: false,
        geometry: {
          type: "polygon",
          points: [
            { x: 250, y: 100 },
            { x: 750, y: 100 },
            { x: 750, y: 200 },
          ],
        },
      },
    ],
    connectors: [
      {
        id: "lift",
        kind: "lift",
        name: "Main lift",
        levelIds: ["level-ground", "level-one"],
        position: { x: 750, y: 400 },
        accessibility: "accessible",
      },
    ],
    routeNodes: [
      {
        id: "entrance",
        levelId: "level-ground",
        kind: "entrance",
        position: { x: 50, y: 450 },
        accessibility: "accessible",
      },
    ],
    routeEdges: [
      {
        id: "walking-1",
        fromNodeId: "entrance",
        toNodeId: "door-1",
        kind: "walking",
        bidirectional: true,
        distanceMetres: 12,
        accessibility: "accessible",
      },
    ],
  };
  const original = structuredClone(document);

  const remapped = remapIndoorDocumentToFootprint(document, projection);

  assert.deepEqual(document, original);
  assert.deepEqual(remapped.viewBox, { width: 400, height: 100 });
  assert.deepEqual(
    remapped.levels.map((level) => level.outline),
    [projection.outline, projection.outline],
  );
  assert.notStrictEqual(remapped.levels[0].outline, projection.outline);
  assert.notStrictEqual(remapped.levels[0].outline, remapped.levels[1].outline);
  const scale = remapped.spaces[0].geometry.width / 200;
  assert.ok(scale > 0 && scale <= 1);
  assert.equal(remapped.spaces[0].geometry.height, 100 * scale);
  assert.equal(remapped.spaces[0].geometry.cornerRadius, 20 * scale);
  assert.equal(remapped.spaces[1].geometry.rx, 100 * scale);
  assert.equal(remapped.spaces[1].geometry.ry, 50 * scale);
  assert.ok(
    Math.abs(
      remapped.spaces[2].geometry.points[1].x -
        remapped.spaces[2].geometry.points[0].x -
        500 * scale,
    ) < 1e-9,
  );
  assert.deepEqual(remapped.walls[0].points, projection.outline);
  assert.notStrictEqual(remapped.walls[0].points, projection.outline);
  assert.notStrictEqual(
    remapped.walls[0].openings[0],
    document.walls[0].openings[0],
  );
  assert.notStrictEqual(remapped.walls[1].points, document.walls[1].points);
  assert.ok(
    Math.abs(
      remapped.walls[1].points[1].x -
        remapped.walls[1].points[0].x -
        800 * scale,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      remapped.connectors[0].position.x -
        remapped.routeNodes[0].position.x -
        700 * scale,
    ) < 1e-9,
    "one similarity transform preserves authored relationships",
  );
  assert.deepEqual(remapped.routeEdges, document.routeEdges);
  assert.notStrictEqual(remapped.routeEdges[0], document.routeEdges[0]);
  assertDocumentContentContained(remapped, projection);
  assert.equal(
    isIndoorDocumentWithinFootprint(
      {
        ...remapped,
        spaces: remapped.spaces.map((space, index) =>
          index === 0
            ? {
                ...space,
                geometry: {
                  type: "polygon",
                  points: [
                    { x: -10, y: -10 },
                    { x: 0, y: -10 },
                    { x: 0, y: 0 },
                  ],
                },
              }
            : space,
        ),
      },
      projection,
    ),
    false,
  );
  assert.deepEqual(
    remapIndoorDocumentToFootprint(remapped, projection),
    remapped,
    "a canonical contained document is idempotent",
  );
});

test("canonicalises generated perimeters when the view-box size is unchanged", () => {
  const projection = {
    viewBox: { width: 100, height: 100 },
    outline: [
      { x: 30, y: 10 },
      { x: 70, y: 10 },
      { x: 70, y: 90 },
      { x: 30, y: 90 },
    ],
    polygons: [],
    dimensionsMetres: { width: 4, height: 8 },
    metresPerUnit: 0.1,
  };
  const staleOutline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const document = {
    version: 2,
    viewBox: { width: 100, height: 100 },
    levels: [
      {
        id: "level-ground",
        number: 0,
        ref: "G",
        name: "Ground floor",
        elevationMetres: 0,
        heightMetres: 3.6,
        outline: staleOutline,
      },
    ],
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: staleOutline,
        thickness: 2,
        closed: true,
        openings: [
          {
            id: "front-door",
            kind: "door",
            segmentIndex: 0,
            offset: 0.3,
            width: 60,
            accessibility: "accessible",
            exterior: true,
          },
        ],
      },
      {
        id: "authored-wall",
        levelId: "level-ground",
        kind: "partition",
        points: [
          { x: 20, y: 50 },
          { x: 80, y: 50 },
        ],
        thickness: 1,
        closed: false,
        openings: [],
      },
    ],
    spaces: [],
    connectors: [],
    routeNodes: [],
    routeEdges: [],
  };

  const remapped = remapIndoorDocumentToFootprint(document, projection);

  assert.deepEqual(remapped.levels[0].outline, projection.outline);
  assert.deepEqual(remapped.walls[0].points, projection.outline);
  assert.notStrictEqual(remapped.walls[0].points, projection.outline);
  assert.notStrictEqual(remapped.walls[0].points[0], projection.outline[0]);
  const opening = remapped.walls[0].openings[0];
  const openingStart = remapped.walls[0].points[opening.segmentIndex];
  const openingEnd =
    remapped.walls[0].points[
      (opening.segmentIndex + 1) % remapped.walls[0].points.length
    ];
  assert.ok(
    opening.width <=
      Math.hypot(openingEnd.x - openingStart.x, openingEnd.y - openingStart.y),
  );
  assert.ok(opening.offset >= 0 && opening.offset <= 1);
  assert.notStrictEqual(remapped.walls[1].points, document.walls[1].points);
  assertDocumentContentContained(remapped, projection);
});

test("refits a canonical wall when its full thickness crosses the footprint", () => {
  const outline = [
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 80, y: 80 },
    { x: 20, y: 80 },
  ];
  const projection = {
    viewBox: { width: 100, height: 100 },
    outline,
    polygons: [{ exterior: outline, holes: [] }],
    dimensionsMetres: { width: 6, height: 6 },
    metresPerUnit: 0.1,
  };
  const document = {
    version: 2,
    viewBox: { width: 100, height: 100 },
    levels: [
      {
        id: "level-ground",
        number: 0,
        ref: "G",
        name: "Ground floor",
        elevationMetres: 0,
        heightMetres: 3.6,
        outline,
      },
    ],
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: outline,
        thickness: 2,
        closed: true,
        openings: [],
      },
      {
        id: "thick-partition",
        levelId: "level-ground",
        kind: "partition",
        points: [
          { x: 30, y: 21 },
          { x: 70, y: 21 },
        ],
        thickness: 10,
        closed: false,
        openings: [],
      },
    ],
    spaces: [],
    connectors: [],
    routeNodes: [],
    routeEdges: [],
  };

  assert.equal(
    isIndoorDocumentWithinFootprint(document, projection),
    false,
    "the centreline is inside but half the wall crosses the top edge",
  );

  const remapped = remapIndoorDocumentToFootprint(document, projection);

  assert.notDeepEqual(remapped, document);
  assert.equal(isIndoorDocumentWithinFootprint(remapped, projection), true);
  assert.deepEqual(
    remapIndoorDocumentToFootprint(remapped, projection),
    remapped,
    "a thickness-safe canonical document remains idempotent",
  );
});

test("rejects spoofed and oversized perimeter walls at the save boundary", () => {
  const outline = [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 90, y: 90 },
    { x: 10, y: 90 },
  ];
  const projection = {
    viewBox: { width: 100, height: 100 },
    outline,
    polygons: [{ exterior: outline, holes: [] }],
    dimensionsMetres: { width: 8, height: 8 },
    metresPerUnit: 0.1,
  };
  const document = {
    version: 2,
    viewBox: projection.viewBox,
    levels: [
      {
        id: "level-ground",
        number: 0,
        ref: "G",
        name: "Ground floor",
        elevationMetres: 0,
        heightMetres: 3.6,
        outline,
      },
    ],
    walls: [],
    spaces: [],
    connectors: [],
    routeNodes: [],
    routeEdges: [],
  };
  const spoofed = {
    ...document,
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 200, y: 200 },
        ],
        thickness: 100,
        closed: true,
        openings: [],
      },
    ],
  };
  const oversizedLegacy = {
    ...document,
    walls: [
      {
        id: "legacy-external-wall",
        levelId: "level-ground",
        kind: "structural",
        points: outline,
        thickness: 100,
        closed: true,
        openings: [],
      },
    ],
  };

  assert.equal(isIndoorDocumentWithinFootprint(spoofed, projection), false);
  assert.equal(
    isIndoorDocumentWithinFootprint(oversizedLegacy, projection),
    false,
  );
});

test("keeps valid canonical content on a secondary footprint part", () => {
  const main = [
    { x: 5, y: 5 },
    { x: 45, y: 5 },
    { x: 45, y: 45 },
    { x: 5, y: 45 },
  ];
  const annex = [
    { x: 60, y: 60 },
    { x: 95, y: 60 },
    { x: 95, y: 95 },
    { x: 60, y: 95 },
  ];
  const projection = {
    viewBox: { width: 100, height: 100 },
    outline: main,
    polygons: [
      { exterior: main, holes: [] },
      { exterior: annex, holes: [] },
    ],
    dimensionsMetres: { width: 9, height: 9 },
    metresPerUnit: 0.1,
  };
  const document = {
    version: 2,
    viewBox: { width: 100, height: 100 },
    levels: [
      {
        id: "level-ground",
        number: 0,
        ref: "G",
        name: "Ground floor",
        elevationMetres: 0,
        heightMetres: 3.6,
        outline: main,
      },
    ],
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: main,
        thickness: 2,
        closed: true,
        openings: [],
      },
    ],
    spaces: [
      {
        id: "annex-room",
        levelId: "level-ground",
        kind: "room",
        ref: "G.01",
        name: "Annex room",
        searchable: true,
        geometry: {
          type: "rectangle",
          x: 65,
          y: 65,
          width: 10,
          height: 10,
          cornerRadius: 0,
        },
      },
    ],
    connectors: [],
    routeNodes: [],
    routeEdges: [],
  };

  assert.equal(isIndoorDocumentWithinFootprint(document, projection), true);
  assert.deepEqual(
    remapIndoorDocumentToFootprint(document, projection),
    document,
    "valid annex content must not be moved into the largest polygon",
  );
});

test("fits every seeded Copland space and connector into its real footprint", async () => {
  const [campus, coplandV1] = await Promise.all([
    readFile(
      new URL("../lib/rooms/demo-campus-map.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("./fixtures/indoor-copland-v1.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);
  const place = campus.places.find(
    (candidate) => candidate.slug === "osm-way-4851973",
  );
  const feature = campus.features.find(
    (candidate) => candidate.placeId === place.id,
  );
  const projection = projectBuildingFootprint(feature.geometry);
  const document = indoorMapMigrate.readCampusIndoorDocument(coplandV1);

  const remapped = remapIndoorDocumentToFootprint(document, projection);

  assert.equal(projection.outline.length, 23);
  assert.deepEqual(
    remapped.levels.map((level) => level.outline),
    remapped.levels.map(() => projection.outline),
  );
  assert.equal(
    remapped.spaces[0].geometry.type,
    "polygon",
    "the rotated legacy rectangle becomes an editable shaped room",
  );
  assert.equal(
    remapped.spaces[1].geometry.type,
    "polygon",
    "the rotated legacy ellipse keeps its boundary as a shaped room",
  );
  assert.ok(
    Math.hypot(
      remapped.connectors[1].position.x - remapped.connectors[0].position.x,
      remapped.connectors[1].position.y - remapped.connectors[0].position.y,
    ) > 0,
    "the shared transform preserves connector separation",
  );
  assertDocumentContentContained(remapped, projection);
  assert.deepEqual(
    remapIndoorDocumentToFootprint(remapped, projection),
    remapped,
    "saving the aligned result cannot repeatedly shrink or rotate it",
  );
});

test("unprojects local points back to the coordinates they came from", () => {
  const projection = projectBuildingFootprint({
    type: "Polygon",
    coordinates: [coordinateRectangle({ widthMetres: 60, heightMetres: 25 })],
  });

  // A round trip has to hold to well within a centimetre, because the outdoor
  // route joins the indoor one at an entrance derived this way.
  for (const point of projection.outline) {
    const [longitude, latitude] = footprint.unprojectIndoorPoint(
      projection,
      point,
    );
    const back = {
      x:
        projection.reference.offsetX +
        (longitude - projection.reference.west) *
          ((2 * Math.PI * 6_371_008.8) / 360) *
          Math.cos((projection.reference.latitude * Math.PI) / 180) *
          (1 / projection.metresPerUnit),
      y:
        projection.reference.offsetY +
        (projection.reference.north - latitude) *
          ((2 * Math.PI * 6_371_008.8) / 360) *
          (1 / projection.metresPerUnit),
    };
    assert.ok(Math.abs(back.x - point.x) < 0.1);
    assert.ok(Math.abs(back.y - point.y) < 0.1);
  }
});

test("projecting and unprojecting a point are exact inverses", () => {
  const projection = projectBuildingFootprint({
    type: "Polygon",
    coordinates: [coordinateRectangle({ widthMetres: 80, heightMetres: 40 })],
  });

  for (const point of [
    { x: 12.5, y: 40 },
    { x: 400, y: 220 },
    ...projection.outline,
  ]) {
    const [longitude, latitude] = footprint.unprojectIndoorPoint(
      projection,
      point,
    );
    const back = footprint.projectIndoorPoint(projection, longitude, latitude);
    assert.ok(
      Math.abs(back.x - point.x) < 1e-6 && Math.abs(back.y - point.y) < 1e-6,
      `round trip drifted from ${JSON.stringify(point)} to ${JSON.stringify(back)}`,
    );
  }
});
