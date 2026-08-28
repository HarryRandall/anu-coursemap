/**
 * Generates the demo indoor map bundled with `lib/rooms/demo-campus-map.json`.
 *
 * Demo mode has no database, so without a document here nothing indoor is
 * reachable in demo mode and none of it can be asserted by the rendered HTML
 * tests. The plan is laid out against a real ANU building footprint so the
 * fixture exercises the same projection the editor uses.
 *
 * Run with: node scripts/rooms/generate-demo-indoor-map.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { loadLibModules } from "../../tests/helpers/lib-modules.mjs";

const DEMO_BUILDING_SLUG = "osm-way-52333714";
const WALL_THICKNESS = 2;
const PARTITION_THICKNESS = 1.5;
const DOOR_WIDTH = 9;
const CORRIDOR_HALF_WIDTH = 12;
const LEVEL_HEIGHT_METRES = 3.6;

const demoPath = new URL(
  "../../lib/rooms/demo-campus-map.json",
  import.meta.url,
);

function id(prefix, index) {
  return `demo-${prefix}-${index}`;
}

/** Lays a central corridor with rooms either side into an interior rectangle. */
function buildLevel({ levelIndex, interior, roomsPerSide, refPrefix }) {
  const levelId = id("level", levelIndex);
  const midY = (interior.minY + interior.maxY) / 2;
  const corridorTop = midY - CORRIDOR_HALF_WIDTH;
  const corridorBottom = midY + CORRIDOR_HALF_WIDTH;
  const roomWidth = (interior.maxX - interior.minX) / roomsPerSide;

  const spaces = [
    {
      id: id(`corridor-${levelIndex}`, 0),
      levelId,
      kind: "corridor",
      ref: "",
      name: "Main corridor",
      searchable: false,
      geometry: {
        type: "rectangle",
        x: interior.minX,
        y: corridorTop,
        width: interior.maxX - interior.minX,
        height: CORRIDOR_HALF_WIDTH * 2,
        cornerRadius: 0,
      },
    },
  ];
  const walls = [];

  for (const side of ["north", "south"]) {
    const top = side === "north" ? interior.minY : corridorBottom;
    const height =
      side === "north"
        ? corridorTop - interior.minY
        : interior.maxY - corridorBottom;

    // One partition run along the corridor, with a door into each room.
    const partitionY = side === "north" ? corridorTop : corridorBottom;
    const openings = [];

    for (let index = 0; index < roomsPerSide; index += 1) {
      const x = interior.minX + index * roomWidth;
      const number = side === "north" ? index + 1 : roomsPerSide + index + 1;
      const spaceId = id(`room-${levelIndex}`, number);
      spaces.push({
        id: spaceId,
        levelId,
        kind: "room",
        ref: `${refPrefix}${String(number).padStart(2, "0")}`,
        name:
          number % 3 === 0
            ? "Seminar room"
            : number % 3 === 1
              ? "Teaching room"
              : "Meeting room",
        searchable: true,
        geometry: {
          type: "rectangle",
          x: x + 2,
          y: top + 2,
          width: roomWidth - 4,
          height: height - 4,
          cornerRadius: 2,
        },
      });
      openings.push({
        id: id(`door-${levelIndex}-${side}`, number),
        kind: "door",
        segmentIndex: 0,
        offset: (index + 0.5) / roomsPerSide,
        width: DOOR_WIDTH,
        accessibility: "accessible",
        spaceId,
      });
    }

    walls.push({
      id: id(`partition-${levelIndex}`, side === "north" ? 0 : 1),
      levelId,
      kind: "partition",
      points: [
        { x: interior.minX, y: partitionY },
        { x: interior.maxX, y: partitionY },
      ],
      thickness: PARTITION_THICKNESS,
      closed: false,
      openings,
    });
  }

  return {
    levelId,
    spaces,
    walls,
    midY,
    corridor: { corridorTop, corridorBottom },
  };
}

const { "indoor-footprint": footprintModule, "indoor-map": indoorMap } =
  await loadLibModules(
    ["rooms/indoor-footprint", "rooms/indoor-map"],
    "demo-indoor",
  );

const demo = JSON.parse(await readFile(demoPath, "utf8"));
const place = demo.places.find((entry) => entry.slug === DEMO_BUILDING_SLUG);
if (!place) throw new Error(`Demo building ${DEMO_BUILDING_SLUG} is missing.`);
const feature = demo.features.find(
  (entry) => entry.featureKind === "building" && entry.placeId === place.id,
);
if (!feature) throw new Error(`Demo building ${place.name} has no footprint.`);

const projection = footprintModule.projectBuildingFootprint(feature.geometry);
const bounds = projection.outline.reduce(
  (current, point) => ({
    minX: Math.min(current.minX, point.x),
    minY: Math.min(current.minY, point.y),
    maxX: Math.max(current.maxX, point.x),
    maxY: Math.max(current.maxY, point.y),
  }),
  {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  },
);
// Hold the interior clear of the real outline so nothing pokes through a wall.
const inset = 18;
const interior = {
  minX: bounds.minX + inset,
  minY: bounds.minY + inset,
  maxX: bounds.maxX - inset,
  maxY: bounds.maxY - inset,
};

const levels = [
  { number: 0, ref: "G", name: "Ground floor", refPrefix: "G", rooms: 4 },
  { number: 1, ref: "1", name: "Level 1", refPrefix: "1.", rooms: 3 },
].map((level, index) => ({ ...level, index }));

const built = levels.map((level) =>
  buildLevel({
    levelIndex: level.index,
    interior,
    roomsPerSide: level.rooms,
    refPrefix: level.refPrefix,
  }),
);

const liftPosition = {
  x: interior.minX + (interior.maxX - interior.minX) * 0.5,
  y: built[0].midY,
};

const document = {
  version: 2,
  viewBox: { ...projection.viewBox },
  levels: levels.map((level, index) => ({
    id: built[index].levelId,
    number: level.number,
    ref: level.ref,
    name: level.name,
    elevationMetres: level.number * LEVEL_HEIGHT_METRES,
    heightMetres: LEVEL_HEIGHT_METRES,
    outline: projection.outline.map((point) => ({ ...point })),
  })),
  walls: [
    // The real footprint, drawn as each level's perimeter. The ground
    // perimeter carries the building entrance.
    ...levels.map((level, index) => ({
      id: id("perimeter", index),
      levelId: built[index].levelId,
      kind: "structural",
      points: projection.outline.map((point) => ({ ...point })),
      thickness: WALL_THICKNESS,
      closed: true,
      openings:
        index === 0
          ? [
              {
                id: "demo-entrance-0",
                kind: "door",
                segmentIndex: 0,
                offset: 0.5,
                width: 20,
                accessibility: "accessible",
                exterior: true,
              },
            ]
          : [],
    })),
    ...built.flatMap((level) => level.walls),
  ],
  spaces: built.flatMap((level) => level.spaces),
  connectors: [
    {
      id: "demo-lift",
      kind: "lift",
      name: "Main lift",
      levelIds: built.map((level) => level.levelId),
      position: liftPosition,
      accessibility: "accessible",
    },
  ],
  routeNodes: built.map((level) => ({
    id: id("junction", level.levelId),
    levelId: level.levelId,
    kind: "junction",
    position: { x: liftPosition.x, y: level.midY },
  })),
  routeEdges: [],
};

// Join every door to the corridor junction on its level, then the junction to
// the lift, so the authored network is actually walkable.
const routed = indoorMap.buildIndoorRouteGraph(document);
const authoredEdges = [];
for (const level of built) {
  const junctionId = id("junction", level.levelId);
  const liftNodeId = indoorMap.indoorConnectorRouteNodeId(
    "demo-lift",
    level.levelId,
  );
  const junction = routed.routeNodes.find((node) => node.id === junctionId);
  authoredEdges.push({
    id: `demo-lift-path-${level.levelId}`,
    fromNodeId: junctionId,
    toNodeId: liftNodeId,
    kind: "walking",
    bidirectional: true,
    distanceMetres: indoorMap.indoorDistanceMetres(
      junction.position,
      liftPosition,
    ),
    accessibility: "accessible",
  });

  const doors = routed.routeNodes.filter(
    (node) =>
      node.levelId === level.levelId &&
      (node.kind === "door" || node.kind === "entrance"),
  );
  doors.forEach((door, index) => {
    authoredEdges.push({
      id: `demo-door-path-${level.levelId}-${index}`,
      fromNodeId: door.id,
      toNodeId: junctionId,
      kind: "walking",
      bidirectional: true,
      distanceMetres: indoorMap.indoorDistanceMetres(
        door.position,
        junction.position,
      ),
      accessibility: "accessible",
    });
  });
}

const finalDocument = indoorMap.buildIndoorRouteGraph({
  ...document,
  routeEdges: authoredEdges,
});

demo.indoorMaps = [
  {
    id: "demo-indoor-map-forestry",
    buildingPlaceId: place.id,
    name: `${place.name} indoor map`,
    revision: 1,
    document: finalDocument,
  },
];

await writeFile(demoPath, `${JSON.stringify(demo, null, 2)}\n`);

const rooms = indoorMap.listIndoorRoomDetails(finalDocument);
console.log(
  `Demo indoor map for ${place.name}: ${finalDocument.levels.length} levels, ${finalDocument.walls.length} walls, ${rooms.length} searchable rooms, ${finalDocument.routeEdges.length} edges.`,
);
const sample = indoorMap.findIndoorRoute(
  finalDocument,
  rooms[0].spaceId,
  rooms.at(-1).spaceId,
  { accessibleOnly: true },
);
console.log(
  sample
    ? `Sample route ${rooms[0].ref} to ${rooms.at(-1).ref}: ${sample.distanceMetres} m across ${sample.levelIds.length} levels.`
    : "No sample route found.",
);
