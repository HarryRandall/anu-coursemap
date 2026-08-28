import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadLibModules } from "./helpers/lib-modules.mjs";

const modules = await loadLibModules(
  ["rooms/indoor-3d", "rooms/indoor-footprint", "rooms/indoor-map-migrate"],
  "indoor-3d",
);
const { buildIndoorScene } = modules["indoor-3d"];
const {
  projectBuildingFootprint,
  remapIndoorDocumentToFootprint,
  unprojectIndoorPoint,
} = modules["indoor-footprint"];
const { readCampusIndoorDocument } = modules["indoor-map-migrate"];

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

function closedCoordinates(projection, points) {
  const coordinates = points.map((point) =>
    unprojectIndoorPoint(projection, point),
  );
  return [...coordinates, coordinates[0]];
}

function createFixture() {
  const exterior = coordinateRectangle({ widthMetres: 80, heightMetres: 50 });
  const hole = coordinateRectangle({
    longitude: exterior[0][0] + 0.0002,
    latitude: exterior[0][1] + 0.0001,
    widthMetres: 8,
    heightMetres: 6,
  });
  const annex = coordinateRectangle({
    longitude: 149.1212,
    latitude: -35.28,
    widthMetres: 12,
    heightMetres: 10,
  });
  const projection = projectBuildingFootprint({
    type: "MultiPolygon",
    coordinates: [[exterior, hole], [annex]],
  });
  const deliberatelyWrongFloorOutline = [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
  ];
  const levels = [
    {
      id: "level-basement",
      number: -1,
      ref: "B1",
      name: "Basement",
      elevationMetres: -3.6,
      heightMetres: 3.6,
      outline: deliberatelyWrongFloorOutline,
    },
    {
      id: "level-ground",
      number: 0,
      ref: "G",
      name: "Ground floor",
      elevationMetres: 0,
      heightMetres: 3.6,
      outline: deliberatelyWrongFloorOutline,
    },
    {
      id: "level-one",
      number: 1,
      ref: "1",
      name: "Level 1",
      elevationMetres: 3.6,
      heightMetres: 3.6,
      outline: deliberatelyWrongFloorOutline,
    },
  ];
  const document = {
    version: 2,
    viewBox: projection.viewBox,
    levels,
    walls: [
      {
        id: "wall-outline-level-ground",
        levelId: "level-ground",
        kind: "structural",
        points: projection.outline,
        thickness: 2,
        closed: true,
        openings: [
          {
            id: "entrance-main",
            kind: "door",
            segmentIndex: 0,
            offset: 0.5,
            width: 12,
            accessibility: "accessible",
            exterior: true,
          },
        ],
      },
      {
        id: "partition-main",
        levelId: "level-ground",
        kind: "partition",
        points: [
          projection.outline[0],
          projection.outline[1],
          projection.outline[2],
        ],
        thickness: 4,
        closed: false,
        openings: [
          {
            id: "door-main",
            kind: "door",
            segmentIndex: 0,
            offset: 0.5,
            width: 9,
            accessibility: "accessible",
          },
        ],
      },
    ],
    spaces: [],
    connectors: [
      {
        id: "lift-main",
        kind: "lift",
        name: "Main lift",
        levelIds: levels.map((level) => level.id),
        position: projection.outline[0],
        accessibility: "accessible",
      },
    ],
    routeNodes: [
      {
        id: "lift-ground",
        levelId: "level-ground",
        kind: "connector",
        position: projection.outline[0],
        connectorId: "lift-main",
      },
      {
        id: "lift-one",
        levelId: "level-one",
        kind: "connector",
        position: projection.outline[0],
        connectorId: "lift-main",
      },
    ],
    routeEdges: [
      {
        id: "lift-ground-one",
        fromNodeId: "lift-ground",
        toNodeId: "lift-one",
        kind: "lift",
        bidirectional: true,
        distanceMetres: 3.6,
        accessibility: "accessible",
      },
    ],
  };

  return { document, projection };
}

test("builds thin floor plates from every footprint part and hole", () => {
  const { document, projection } = createFixture();
  const scene = buildIndoorScene(document, projection, {
    explode: 2,
    activeLevelId: "level-ground",
  });

  assert.equal(scene.slabs.features.length, 6);
  assert.deepEqual(
    scene.slabs.features.map((feature) => feature.id),
    [
      "level-basement:footprint:0",
      "level-basement:footprint:1",
      "level-ground:footprint:0",
      "level-ground:footprint:1",
      "level-one:footprint:0",
      "level-one:footprint:1",
    ],
  );
  for (const slab of scene.slabs.features) {
    assert.ok(
      Math.abs(slab.properties.height - slab.properties.base - 0.05) < 1e-9,
    );
    assert.equal(
      slab.properties.active,
      slab.properties.levelId === "level-ground",
    );
  }

  const groundMain = scene.slabs.features.find(
    (feature) => feature.id === "level-ground:footprint:0",
  );
  assert.ok(groundMain);
  assert.equal(groundMain.geometry.type, "Polygon");
  assert.equal(groundMain.geometry.coordinates.length, 2);
  assert.deepEqual(
    groundMain.geometry.coordinates[0],
    closedCoordinates(projection, projection.polygons[0].exterior),
  );
  assert.deepEqual(
    groundMain.geometry.coordinates[1],
    closedCoordinates(projection, projection.polygons[0].holes[0]),
  );

  const groundAnnex = scene.slabs.features.find(
    (feature) => feature.id === "level-ground:footprint:1",
  );
  assert.ok(groundAnnex);
  assert.equal(groundAnnex.geometry.coordinates.length, 1);
});

test("keeps plan mode to one floor and restores the stack in 3D", () => {
  const { document, projection } = createFixture();
  const plan = buildIndoorScene(document, projection, {
    activeLevelId: "level-ground",
    showInactiveLevels: false,
  });
  const wholeBuilding = buildIndoorScene(document, projection, {
    activeLevelId: "level-ground",
    showInactiveLevels: true,
  });

  assert.equal(plan.slabs.features.length, projection.polygons.length);
  assert.ok(
    plan.slabs.features.every(
      (feature) => feature.properties.levelId === "level-ground",
    ),
  );
  assert.equal(plan.connectors.features[0].properties.base, 0);
  assert.equal(plan.connectors.features[0].properties.height, 0.6);
  assert.equal(
    wholeBuilding.slabs.features.length,
    document.levels.length * projection.polygons.length,
  );
  assert.ok(
    wholeBuilding.connectors.features[0].properties.height >
      plan.connectors.features[0].properties.height,
  );
});

test("keeps every floor's authored features in the whole-building scene", () => {
  const { document, projection } = createFixture();
  const authoredLevels = ["level-basement", "level-ground", "level-one"];
  const spaces = authoredLevels.map((levelId, index) => ({
    id: `room-${levelId}`,
    levelId,
    kind: index === 1 ? "corridor" : "room",
    ref: index === 0 ? "B01" : index === 1 ? "G01" : "1.01",
    name: `${levelId} room`,
    searchable: true,
    geometry: {
      type: "rectangle",
      x: 100 + index * 90,
      y: 100,
      width: 60,
      height: 50,
      cornerRadius: 0,
    },
  }));
  const floorWalls = authoredLevels
    .filter((levelId) => levelId !== "level-ground")
    .map((levelId, index) => ({
      id: `partition-${levelId}`,
      levelId,
      kind: "partition",
      points: [
        { x: 120 + index * 100, y: 180 },
        { x: 180 + index * 100, y: 180 },
      ],
      thickness: 3,
      closed: false,
      openings: [
        {
          id: `door-${levelId}`,
          kind: "door",
          segmentIndex: 0,
          offset: 0.5,
          width: 9,
          accessibility: "accessible",
        },
      ],
    }));
  const routeNodes = authoredLevels.flatMap((levelId, index) => [
    {
      id: `route-${levelId}-start`,
      levelId,
      kind: "junction",
      position: { x: 120 + index * 90, y: 220 },
    },
    {
      id: `route-${levelId}-end`,
      levelId,
      kind: "junction",
      position: { x: 170 + index * 90, y: 220 },
    },
  ]);
  const routeEdges = authoredLevels.map((levelId) => ({
    id: `route-${levelId}`,
    fromNodeId: `route-${levelId}-start`,
    toNodeId: `route-${levelId}-end`,
    kind: "walking",
    bidirectional: true,
    distanceMetres: 5,
    accessibility: "accessible",
  }));
  const authoredDocument = {
    ...document,
    spaces,
    walls: [...document.walls, ...floorWalls],
    routeNodes: [...document.routeNodes, ...routeNodes],
    routeEdges: [...document.routeEdges, ...routeEdges],
  };
  const selectedRoutes = new Set([
    ...routeEdges.map((edge) => edge.id),
    "lift-ground-one",
  ]);

  const plan = buildIndoorScene(authoredDocument, projection, {
    activeLevelId: "level-ground",
    showInactiveLevels: false,
    routeEdgeIds: selectedRoutes,
  });
  const wholeBuilding = buildIndoorScene(authoredDocument, projection, {
    activeLevelId: "level-ground",
    showInactiveLevels: true,
    routeEdgeIds: selectedRoutes,
  });

  for (const collection of [
    plan.slabs,
    plan.rooms,
    plan.walls,
    plan.openings,
    plan.route,
    plan.labels,
  ]) {
    assert.ok(
      collection.features.every(
        (feature) => feature.properties.levelId === "level-ground",
      ),
    );
  }
  assert.equal(plan.connectors.features.length, 1);
  assert.equal(plan.connectors.features[0].properties.height, 0.6);
  assert.deepEqual(
    plan.route.features.map((feature) => feature.properties.routeNodeId),
    ["route-level-ground-start"],
  );

  for (const collection of [
    wholeBuilding.slabs,
    wholeBuilding.rooms,
    wholeBuilding.walls,
    wholeBuilding.openings,
    wholeBuilding.route,
    wholeBuilding.labels,
  ]) {
    assert.deepEqual(
      new Set(collection.features.map((feature) => feature.properties.levelId)),
      new Set(authoredLevels),
    );
    assert.ok(
      collection.features.some((feature) => feature.properties.active === true),
    );
    assert.ok(
      collection.features.some(
        (feature) => feature.properties.active === false,
      ),
    );
  }
  assert.deepEqual(
    new Set(
      wholeBuilding.labels.features.map(
        (feature) => feature.properties.levelRef,
      ),
    ),
    new Set(["B1", "G", "1"]),
  );
  assert.deepEqual(
    new Set(
      wholeBuilding.route.features.map(
        (feature) => feature.properties.routeNodeId,
      ),
    ),
    new Set([
      "route-level-basement-start",
      "route-level-ground-start",
      "route-level-one-start",
    ]),
  );
  assert.equal(wholeBuilding.connectors.features.length, 1);
  assert.ok(
    wholeBuilding.connectors.features[0].properties.height >
      plan.connectors.features[0].properties.height,
  );
});

test("uses floor elevations rather than display numbers for scene height", () => {
  const { document, projection } = createFixture();
  const levels = document.levels.map((level) =>
    level.id === "level-basement"
      ? { ...level, number: 8, elevationMetres: -3.6 }
      : level.id === "level-ground"
        ? { ...level, number: 12, elevationMetres: 0 }
        : { ...level, number: -4, elevationMetres: 9 },
  );
  const scene = buildIndoorScene({ ...document, levels }, projection, {
    explode: 2,
    activeLevelId: "level-ground",
    showInactiveLevels: true,
  });
  const shaft = scene.connectors.features[0];

  assert.equal(shaft.properties.base, -7.2);
  assert.equal(shaft.properties.height, 21.6);
  assert.equal(scene.topMetres, 21.6);
});

test("segments wall runs, marks the canonical outline and preserves connectors", () => {
  const { document, projection } = createFixture();
  const scene = buildIndoorScene(document, projection, {
    explode: 2,
    activeLevelId: "level-ground",
    routeEdgeIds: new Set(["lift-ground-one"]),
  });

  const perimeter = scene.walls.features.filter(
    (feature) => feature.properties.wallId === "wall-outline-level-ground",
  );
  const partition = scene.walls.features.filter(
    (feature) => feature.properties.wallId === "partition-main",
  );
  assert.equal(perimeter.length, projection.outline.length);
  assert.equal(partition.length, 2);
  assert.deepEqual(
    perimeter.map((feature) => feature.id),
    projection.outline.map(
      (_point, index) => `wall-outline-level-ground:${index}`,
    ),
  );
  assert.ok(
    perimeter.every((feature) => feature.properties.perimeter === true),
  );
  assert.ok(
    perimeter.every(
      (feature) =>
        Math.abs(feature.properties.height - feature.properties.base - 0.12) <
        1e-9,
    ),
  );
  assert.ok(
    partition.every((feature) => feature.properties.perimeter === false),
  );
  assert.ok(
    partition.every(
      (feature) => feature.properties.height - feature.properties.base > 3,
    ),
  );
  assert.ok(
    [...perimeter, ...partition].every(
      (feature) =>
        feature.geometry.type === "Polygon" &&
        feature.geometry.coordinates.length === 1 &&
        feature.geometry.coordinates[0].length === 5,
    ),
  );

  assert.deepEqual(
    scene.openings.features.map((feature) => feature.properties.openingId),
    ["entrance-main", "door-main"],
  );
  assert.equal(scene.openings.features[0].properties.exterior, true);
  assert.equal(scene.openings.features[1].properties.exterior, false);
  assert.ok(
    scene.openings.features.every(
      (feature) =>
        feature.properties.active === true &&
        feature.geometry.type === "Polygon" &&
        feature.geometry.coordinates[0].length === 5,
    ),
  );

  assert.equal(scene.connectors.features.length, 1);
  assert.equal(
    scene.connectors.features[0].properties.connectorId,
    "lift-main",
  );
  assert.equal(scene.connectors.features[0].properties.onRoute, true);
  assert.equal(scene.route.features.length, 0);
});

test("uses stored wall offsets and widths for distinct door and entrance markers", () => {
  const { document, projection } = createFixture();
  const wall = {
    id: "doorway-wall",
    levelId: "level-ground",
    kind: "partition",
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ],
    thickness: 2,
    closed: false,
    openings: [
      {
        id: "interior-door",
        kind: "door",
        segmentIndex: 0,
        offset: 0.25,
        width: 20,
        accessibility: "accessible",
      },
      {
        id: "exterior-entrance",
        kind: "door",
        segmentIndex: 0,
        offset: 0.75,
        width: 10,
        accessibility: "accessible",
        exterior: true,
      },
    ],
  };
  const scene = buildIndoorScene({ ...document, walls: [wall] }, projection, {
    activeLevelId: "level-ground",
    showInactiveLevels: false,
  });
  const interior = scene.openings.features.find(
    (feature) => feature.id === "interior-door",
  );
  const entrance = scene.openings.features.find(
    (feature) => feature.id === "exterior-entrance",
  );

  assert.ok(interior);
  assert.ok(entrance);
  assert.deepEqual(
    interior.geometry.coordinates[0],
    closedCoordinates(projection, [
      { x: 115, y: 104 },
      { x: 135, y: 104 },
      { x: 135, y: 96 },
      { x: 115, y: 96 },
    ]),
  );
  assert.deepEqual(
    entrance.geometry.coordinates[0],
    closedCoordinates(projection, [
      { x: 170, y: 107 },
      { x: 180, y: 107 },
      { x: 180, y: 93 },
      { x: 170, y: 93 },
    ]),
  );
  assert.equal(interior.properties.exterior, false);
  assert.equal(entrance.properties.exterior, true);
  assert.equal(interior.properties.base, 0.05);
  assert.ok(Math.abs(interior.properties.height - 0.23) < 1e-9);
});

test("recognises a footprint-shaped legacy structural wall as the perimeter", () => {
  const { document, projection } = createFixture();
  const legacyDocument = {
    ...document,
    walls: document.walls.map((wall) =>
      wall.id === "wall-outline-level-ground"
        ? { ...wall, id: "legacy-external-wall" }
        : wall,
    ),
  };

  const scene = buildIndoorScene(legacyDocument, projection, {
    activeLevelId: "level-ground",
  });
  const legacyPerimeter = scene.walls.features.filter(
    (feature) => feature.properties.wallId === "legacy-external-wall",
  );
  assert.equal(legacyPerimeter.length, projection.outline.length);
  assert.ok(
    legacyPerimeter.every((feature) => feature.properties.perimeter === true),
  );
});

test("replaces the Copland sample pentagon with its stored vector footprint", async () => {
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
  const copland = campus.places.find(
    (place) => place.slug === "osm-way-4851973",
  );
  assert.ok(copland);
  const feature = campus.features.find(
    (candidate) => candidate.placeId === copland.id,
  );
  assert.ok(feature);

  const projection = projectBuildingFootprint(feature.geometry);
  const document = remapIndoorDocumentToFootprint(
    readCampusIndoorDocument(coplandV1),
    projection,
  );
  const scene = buildIndoorScene(document, projection, {
    activeLevelId: document.levels[0].id,
  });

  assert.equal(projection.outline.length, 23);
  assert.equal(scene.slabs.features.length, document.levels.length);
  for (const slab of scene.slabs.features) {
    assert.deepEqual(
      slab.geometry.coordinates[0],
      closedCoordinates(projection, projection.outline),
    );
  }
  for (const level of document.levels) {
    assert.deepEqual(level.outline, projection.outline);
    assert.deepEqual(
      document.walls.find((wall) => wall.id === `wall-outline-${level.id}`)
        .points,
      projection.outline,
    );
  }
  assert.equal(
    scene.walls.features.filter((wall) => wall.properties.perimeter === true)
      .length,
    projection.outline.length * document.levels.length,
  );
});
