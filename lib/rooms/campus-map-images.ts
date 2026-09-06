import type { Map as MapLibreMap } from "maplibre-gl";

// The Liberty style uses tile category names that its sprite does not always
// contain. Reuse the nearest available symbol while preserving the POI label.
const POI_IMAGE_ALIASES: Readonly<Record<string, string>> = {
  office: "building",
  bollard: "roadblock",
  recycling: "waste_basket",
  bicycle_parking: "bicycle",
  gate: "entrance",
  motorcycle_parking: "parking",
  atm: "bank",
  sports_centre: "stadium",
  swimming_pool: "swimming",
  cycle_barrier: "roadblock",
  athletics: "stadium",
  lift_gate: "roadblock",
};

/** Resolve from the loaded sprite without extra downloads or invisible icons. */
export function resolveCampusMapImage(
  map: Pick<MapLibreMap, "hasImage" | "getImage" | "addImage">,
  id: string,
) {
  if (map.hasImage(id)) return;
  const alias = POI_IMAGE_ALIASES[id];
  const fallback = alias && map.hasImage(alias) ? alias : "circle";
  // Custom basemaps may not have this sprite. Leave their missing assets
  // visible as warnings rather than inventing a replacement for a pattern.
  if (!map.hasImage(fallback)) return;
  const image = map.getImage(fallback);
  map.addImage(id, image.data, {
    pixelRatio: image.pixelRatio,
    sdf: image.sdf,
    content: image.content,
    stretchX: image.stretchX,
    stretchY: image.stretchY,
  });
}
