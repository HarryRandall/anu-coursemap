import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { appRoot } from "./paths.mjs";
import path from "node:path";

const packageDirectory = path.dirname(
  createRequire(import.meta.url).resolve("maplibre-gl/package.json"),
);
const sourceDirectory = path.join(packageDirectory, "dist");
const destinationDirectory = path.join(appRoot, "public", "maplibre");

mkdirSync(destinationDirectory, { recursive: true });

for (const fileName of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(
    path.join(sourceDirectory, fileName),
    path.join(destinationDirectory, fileName),
  );
}
