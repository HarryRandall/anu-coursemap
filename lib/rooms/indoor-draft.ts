import {
  ringContacts,
  overlappingRooms,
} from "@/lib/rooms/indoor-placement-feedback";
import { indoorGeometryRing } from "@/lib/rooms/indoor-geometry";
import type { CampusIndoorSpace } from "@/lib/rooms/indoor-map";
import { alignedRectangle } from "@/lib/rooms/indoor-orientation";
import type { IndoorDrag } from "@/lib/rooms/indoor-drag";
import {
  isIndoorPointWithinFootprint,
  isIndoorRingWithinFootprint,
  isIndoorSegmentWithinFootprint,
  unprojectIndoorPoint,
  type IndoorFootprintProjection,
} from "@/lib/rooms/indoor-footprint";
import type { IndoorPoint } from "@/lib/rooms/indoor-map";
import {
  DEFAULT_INDOOR_PALETTE,
  type IndoorPalette,
} from "@/lib/rooms/indoor-palette";

export type IndoorDraftTool =
  "rectangle" | "corridor" | "wall" | "polygon" | "path";

export type IndoorDraftProperties = Readonly<{
  draftKind: "area" | "stroke" | "vertex";
  tool: IndoorDraftTool;
  colour: string;
  preview: boolean;
}>;

export type IndoorDraftGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.LineString | GeoJSON.Point,
  IndoorDraftProperties
>;

function toolColour(tool: IndoorDraftTool, palette: IndoorPalette) {
  if (tool === "wall") return palette.draftWall;
  if (tool === "path") return palette.draftPath;
  return palette.draftArea;
}

function samePoint(left: IndoorPoint, right: IndoorPoint) {
  return left.x === right.x && left.y === right.y;
}

function usablePolyline(
  source: readonly IndoorPoint[],
  projection: IndoorFootprintProjection,
) {
  const points: IndoorPoint[] = [];
  for (const point of source) {
    if (!isIndoorPointWithinFootprint(point, projection)) break;
    const previous = points.at(-1);
    if (
      previous &&
      !isIndoorSegmentWithinFootprint(previous, point, projection)
    ) {
      break;
    }
    points.push(point);
  }
  return points;
}

function position(
  projection: IndoorFootprintProjection,
  point: IndoorPoint,
): GeoJSON.Position {
  return [...unprojectIndoorPoint(projection, point)];
}

function properties(
  tool: IndoorDraftTool,
  draftKind: IndoorDraftProperties["draftKind"],
  palette: IndoorPalette,
  preview = false,
): IndoorDraftProperties {
  return {
    draftKind,
    tool,
    colour: toolColour(tool, palette),
    preview,
  };
}

function pointFeature(
  projection: IndoorFootprintProjection,
  point: IndoorPoint,
  tool: IndoorDraftTool,
  preview: boolean,
  palette: IndoorPalette,
): GeoJSON.Feature<GeoJSON.Point, IndoorDraftProperties> {
  return {
    type: "Feature",
    properties: properties(tool, "vertex", palette, preview),
    geometry: {
      type: "Point",
      coordinates: position(projection, point),
    },
  };
}

/**
 * Projects a temporary gesture with contact markers. Red previews indicate
 * invalid placements; the pointer handler still rejects them on completion.
 */
export function buildIndoorDraftGeoJson(
  drag: IndoorDrag,
  projection: IndoorFootprintProjection,
  palette: IndoorPalette = DEFAULT_INDOOR_PALETTE,
  spaces: readonly CampusIndoorSpace[] = [],
): IndoorDraftGeoJson {
  const features: IndoorDraftGeoJson["features"] = [];

  let placementRing: readonly IndoorPoint[] | null = null;
  if (drag.kind === "draw-rect")
    placementRing = alignedRectangle(
      drag.origin,
      drag.current,
      drag.drawingAngle,
    );
  if (drag.kind === "move") {
    const space = spaces.find((space) => space.id === drag.targetId);
    if (space)
      placementRing = indoorGeometryRing(space.geometry).map((point) => ({
        x: point.x + drag.current.x - drag.origin.x,
        y: point.y + drag.current.y - drag.origin.y,
      }));
  }
  if (placementRing) {
    const ring = placementRing;
    const addStroke = (points: readonly IndoorPoint[], colour: string) =>
      features.push({
        type: "Feature",
        properties: { ...properties("rectangle", "stroke", palette), colour },
        geometry: {
          type: "LineString",
          coordinates: points.map((point) => position(projection, point)),
        },
      });
    const mark = (point: IndoorPoint, colour: string) =>
      features.push({
        ...pointFeature(projection, point, "rectangle", true, palette),
        properties: {
          ...properties("rectangle", "vertex", palette, true),
          colour,
        },
      });
    if (drag.kind === "move") addStroke([...ring, ring[0]], palette.selection);
    for (let i = 0; i < ring.length; i++) {
      const next = ring[(i + 1) % ring.length];
      if (!isIndoorSegmentWithinFootprint(ring[i], next, projection))
        addStroke([ring[i], next], "#ef4444");
    }
    for (const polygon of projection.polygons)
      for (const boundary of [polygon.exterior, ...polygon.holes]) {
        ringContacts(ring, boundary).forEach((point) => mark(point, "#ef4444"));
      }
    for (const room of overlappingRooms(
      ring,
      spaces,
      drag.kind === "move" ? drag.targetId : undefined,
    )) {
      const other = indoorGeometryRing(room.geometry);
      addStroke([...other, other[0]], "#f59e0b");
      ringContacts(ring, other).forEach((point) => mark(point, "#f59e0b"));
    }
  }

  if (drag.kind === "draw-rect") {
    const { tool } = drag;
    const ring = alignedRectangle(drag.origin, drag.current, drag.drawingAngle);
    const hasArea =
      Math.hypot(ring[0].x - ring[1].x, ring[0].y - ring[1].y) > 0 &&
      Math.hypot(ring[1].x - ring[2].x, ring[1].y - ring[2].y) > 0;

    if (hasArea) {
      features.push({
        type: "Feature",
        properties: {
          ...properties(tool, "area", palette),
          colour: isIndoorRingWithinFootprint(ring, projection)
            ? toolColour(tool, palette)
            : "#ef4444",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [...ring, ring[0]].map((point) => position(projection, point)),
          ],
        },
      });
    }

    if (isIndoorPointWithinFootprint(drag.origin, projection)) {
      features.push(
        pointFeature(projection, drag.origin, tool, false, palette),
      );
    }
    if (
      !samePoint(drag.origin, drag.current) &&
      isIndoorPointWithinFootprint(drag.current, projection)
    ) {
      features.push(
        pointFeature(projection, drag.current, tool, true, palette),
      );
    }
    return { type: "FeatureCollection", features };
  }

  if (drag.kind !== "draw-points") {
    return { type: "FeatureCollection", features };
  }

  const tool = drag.tool;
  const placed = usablePolyline(drag.points, projection);
  const preview = drag.preview;
  const last = placed.at(-1);
  if (
    last &&
    preview &&
    !isIndoorSegmentWithinFootprint(last, preview, projection)
  ) {
    features.push({
      type: "Feature",
      properties: {
        ...properties(tool, "stroke", palette, true),
        colour: "#ef4444",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          position(projection, last),
          position(projection, preview),
        ],
      },
    });
    for (const polygon of projection.polygons)
      for (const boundary of [polygon.exterior, ...polygon.holes]) {
        ringContacts([last, preview], boundary).forEach((point) =>
          features.push({
            ...pointFeature(projection, point, tool, true, palette),
            properties: {
              ...properties(tool, "vertex", palette, true),
              colour: "#ef4444",
            },
          }),
        );
      }
  }
  const includePreview = Boolean(
    preview &&
    last &&
    !samePoint(last, preview) &&
    isIndoorPointWithinFootprint(preview, projection) &&
    isIndoorSegmentWithinFootprint(last, preview, projection),
  );
  const points = includePreview && preview ? [...placed, preview] : [...placed];
  const coordinates = points.map((point) => position(projection, point));

  if (
    tool === "polygon" &&
    points.length >= 3 &&
    isIndoorRingWithinFootprint(points, projection)
  ) {
    features.push({
      type: "Feature",
      properties: properties(tool, "area", palette),
      geometry: {
        type: "Polygon",
        coordinates: [[...coordinates, coordinates[0]]],
      },
    });
  } else if (coordinates.length >= 2) {
    features.push({
      type: "Feature",
      properties: properties(tool, "stroke", palette),
      geometry: { type: "LineString", coordinates },
    });
  }

  points.forEach((point, index) => {
    features.push(
      pointFeature(
        projection,
        point,
        tool,
        includePreview && index === points.length - 1,
        palette,
      ),
    );
  });

  return { type: "FeatureCollection", features };
}
