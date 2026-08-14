#!/usr/bin/env node

import { open, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ANU_2026_COURSE_CODES,
  fetchAnuCourseManifest,
} from "../../lib/catalogue-import/anu-programs-courses.ts";

const CACHE_DIRECTORY = ".catalogue-cache";
const usage = `Usage:
  npm run catalogue:fetch -- --output .catalogue-cache/anu-2026.json
  npm run catalogue:fetch -- --stdout

Options:
  --course CODE   Fetch a specific course. Repeat to fetch several courses.
  --output PATH   Write a new JSON manifest inside .catalogue-cache/.
  --stdout        Print the JSON manifest instead of writing a file.
  --help, -h      Show this help text.

The default scope is 44 Coursemap courses, including every course referenced by
the authoritative 2026 BCOMP and SOFT-MAJ structures. This command fetches
official ANU HTML only and never writes to a database.`;

function requireSupportedNode() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(major) || major < 24) {
    throw new Error(
      "The catalogue source fetcher requires Node.js 24 or newer.",
    );
  }
}

export function parseFetchArguments(args) {
  const courses = [];
  let output;
  let stdout = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      return { help: true, courses: [], output: undefined, stdout: false };
    }
    if (argument === "--stdout") {
      if (stdout) throw new Error("--stdout may be supplied only once.");
      stdout = true;
      continue;
    }
    if (argument === "--output" || argument === "--course") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.\n\n${usage}`);
      }
      index += 1;
      if (argument === "--output") {
        if (output) throw new Error("--output may be supplied only once.");
        output = value;
      } else {
        courses.push(value);
      }
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n\n${usage}`);
  }

  if (stdout === Boolean(output)) {
    throw new Error(`Choose exactly one of --output or --stdout.\n\n${usage}`);
  }
  return { help: false, courses, output, stdout };
}

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

export function manifestErrorDiagnostics(manifest) {
  return [
    ...(manifest.diagnostics ?? []),
    ...(manifest.documents ?? []).flatMap(
      (document) => document.diagnostics ?? [],
    ),
  ].filter((diagnostic) => diagnostic.severity === "error");
}

async function writeNewManifest(outputPath, contents) {
  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
  let file;
  try {
    file = await open(outputPath, "wx", 0o600);
    await file.writeFile(contents, "utf8");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(
        "The manifest output already exists. Choose a new path so prior provenance is preserved.",
      );
    }
    throw error;
  } finally {
    await file?.close();
  }
}

async function main() {
  requireSupportedNode();
  const options = parseFetchArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const courseCodes =
    options.courses.length > 0 ? options.courses : ANU_2026_COURSE_CODES;
  const signal = AbortSignal.timeout(120_000);
  const manifest = await fetchAnuCourseManifest({ courseCodes, signal });
  const contents = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.stdout) {
    process.stdout.write(contents);
  } else {
    const outputPath = resolveManifestOutputPath(options.output);
    await writeNewManifest(outputPath, contents);
    console.error(
      `Wrote ${manifest.documents.length} documents to ${outputPath}`,
    );
  }

  const errors = manifestErrorDiagnostics(manifest);
  if (errors.length > 0) {
    console.error(
      `The manifest contains ${errors.length} source error${errors.length === 1 ? "" : "s"}; review manifest diagnostics before import.`,
    );
    process.exitCode = 2;
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Catalogue source fetch failed.",
    );
    process.exitCode = 1;
  });
}
