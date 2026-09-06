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

function rectangleRing(
  origin: IndoorPoint,
  current: IndoorPoint,
): readonly IndoorPoint[] {
  const minX = Math.min(origin.x, current.x);
  const minY = Math.min(origin.y, current.y);
  const maxX = Math.max(origin.x, current.x);
  const maxY = Math.max(origin.y, current.y);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
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
 * Projects the active gesture into a short-lived MapLibre source. Invalid
 * segments and rings are omitted, so the preview can never imply that rooms or
 * paths may extend beyond the real building footprint.
 */
export function buildIndoorDraftGeoJson(
  drag: IndoorDrag,
  projection: IndoorFootprintProjection,
  palette: IndoorPalette = DEFAULT_INDOOR_PALETTE,
): IndoorDraftGeoJson {
  const features: IndoorDraftGeoJson["features"] = [];

  if (drag.kind === "draw-rect") {
    const { tool } = drag;
    const ring = rectangleRing(drag.origin, drag.current);
    const hasArea =
      ring[0].x !== ring[1].x &&
      ring[1].y !== ring[2].y &&
      isIndoorRingWithinFootprint(ring, projection);

    if (hasArea) {
      features.push({
        type: "Feature",
        properties: properties(tool, "area", palette),
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
