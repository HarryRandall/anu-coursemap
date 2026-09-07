import assert from "node:assert/strict";
import { test } from "vitest";
const modules = {
  "campus-map-appearance":
    await import("../lib/rooms/campus-map-appearance.ts"),
};
test("basemap labels are hidden while selected building names remain", () => {
  const { isCampusBasemapClutter } = modules["campus-map-appearance"];
  assert.equal(isCampusBasemapClutter({ type: "symbol", id: "poi_r1" }), true);
  assert.equal(
    isCampusBasemapClutter({ type: "symbol", id: "highway-name-minor" }),
    true,
  );
  assert.equal(
    isCampusBasemapClutter({
      type: "symbol",
      id: "coursemap-selected-building-label",
    }),
    false,
  );
});
test("switching themes restores original map colours without reloading its style", () => {
  const layers = [
    { id: "water", type: "fill", paint: { "fill-color": "#abc" } },
  ];
  const values = [];
  const map = {
    getStyle: () => ({ layers }),
    getLayer: (id) => layers.find((layer) => layer.id === id),
    setPaintProperty: (...args) => values.push(args),
    setLayoutProperty: () => {},
  };
  modules["campus-map-appearance"].applyCampusMapAppearance(map, true);
  modules["campus-map-appearance"].applyCampusMapAppearance(map, false);
  assert.deepEqual(values.at(-1), ["water", "fill-color", "#abc"]);
});
