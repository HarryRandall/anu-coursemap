import type { Map as MapLibreMap, LayerSpecification } from "maplibre-gl";

const originals = new WeakMap<MapLibreMap, LayerSpecification[]>();
export function isCampusBasemapClutter(layer: LayerSpecification) {
  return layer.type === "symbol" && !layer.id.startsWith("coursemap-");
}

/** Restyle the loaded vector map in place, preserving camera and selection. */
export function applyCampusMapAppearance(map: MapLibreMap, dark: boolean) {
  if (!originals.has(map))
    originals.set(map, structuredClone(map.getStyle().layers));
  for (const layer of originals.get(map) ?? []) {
    if (!map.getLayer(layer.id)) continue;
    if (isCampusBasemapClutter(layer))
      map.setLayoutProperty(layer.id, "visibility", "none");
    if (layer.id.startsWith("coursemap-") || layer.id.startsWith("campus-"))
      continue;
    const id = layer.id;
    if (layer.type === "background")
      map.setPaintProperty(
        id,
        "background-color",
        dark ? "#13171c" : (layer.paint?.["background-color"] ?? "#f5f4f0"),
      );
    if (layer.type === "fill") {
      const colour = /water/.test(id)
        ? "#172c37"
        : /wood|park|grass|cemetery/.test(id)
          ? "#1c2a25"
          : /building/.test(id)
            ? "#3b424b"
            : "#20252b";
      map.setPaintProperty(
        id,
        "fill-color",
        dark ? colour : (layer.paint?.["fill-color"] ?? "#ecebe7"),
      );
    }
    if (layer.type === "line" && !id.includes("boundary")) {
      const colour = /water/.test(id)
        ? "#274755"
        : /casing/.test(id)
          ? "#15191e"
          : /path|track/.test(id)
            ? "#414941"
            : "#363e48";
      map.setPaintProperty(
        id,
        "line-color",
        dark ? colour : (layer.paint?.["line-color"] ?? "#d4d4d4"),
      );
    }
    if (layer.type === "symbol" && !isCampusBasemapClutter(layer)) {
      map.setPaintProperty(
        id,
        "text-color",
        dark ? "#adb6c0" : (layer.paint?.["text-color"] ?? "#5f6368"),
      );
      map.setPaintProperty(
        id,
        "text-halo-color",
        dark ? "#171c22" : (layer.paint?.["text-halo-color"] ?? "#ffffff"),
      );
    }
  }
  if (map.getLayer("coursemap-anu-buildings-3d"))
    map.setPaintProperty("coursemap-anu-buildings-3d", "fill-extrusion-color", [
      "match",
      ["get", "highlight"],
      "selected",
      "#8b5cf6",
      "routeFrom",
      "#8b5cf6",
      "routeTo",
      "#059669",
      dark ? "#606b78" : "#a1a1aa",
    ]);
  if (map.getLayer("coursemap-terrain-hillshade")) {
    map.setPaintProperty(
      "coursemap-terrain-hillshade",
      "hillshade-highlight-color",
      dark ? "#293039" : "#fffdf7",
    );
    map.setPaintProperty(
      "coursemap-terrain-hillshade",
      "hillshade-shadow-color",
      dark ? "#080c10" : "#473b24",
    );
  }
  if (map.getLayer("coursemap-selected-building-label")) {
    map.setPaintProperty(
      "coursemap-selected-building-label",
      "text-color",
      dark ? "#f1f3f5" : "#27272a",
    );
    map.setPaintProperty(
      "coursemap-selected-building-label",
      "text-halo-color",
      dark ? "#171c22" : "#ffffff",
    );
  }
  if (map.getLayer("coursemap-campus-frame"))
    map.setPaintProperty(
      "coursemap-campus-frame",
      "fill-color",
      dark ? "#09090b" : "#fafafa",
    );
  if (map.getLayer("coursemap-woodland-trees"))
    map.setPaintProperty("coursemap-woodland-trees", "fill-extrusion-color", [
      "match",
      ["get", "part"],
      "trunk",
      dark ? "#50483b" : "#78674e",
      dark ? "#344f43" : "#78916c",
    ]);
}
