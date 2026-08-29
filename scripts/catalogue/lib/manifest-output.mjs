import { isAbsolute, relative, resolve } from "node:path";

const CACHE_DIRECTORY = ".catalogue-cache";

export function resolveManifestOutputPath(output, cwd = process.cwd()) {
  if (typeof output !== "string" || !output.trim()) {
    throw new Error("A non-blank manifest output path is required.");
  }
  const cacheRoot = resolve(cwd, CACHE_DIRECTORY);
  const outputPath = resolve(cwd, output);
  const relativePath = relative(cacheRoot, outputPath);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(
      `Manifest files must be written inside ${CACHE_DIRECTORY}/.`,
    );
  }
  if (!outputPath.toLowerCase().endsWith(".json")) {
    throw new Error("The manifest output path must end in .json.");
  }
  return outputPath;
}
