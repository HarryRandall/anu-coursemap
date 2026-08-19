#!/usr/bin/env node

import { open, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { fetchAnuCourseDirectory } from "../../lib/catalogue-import/anu-course-directory.ts";
import {
  ANU_2026_COURSE_CODES,
  fetchAnuCourseManifest,
} from "../../lib/catalogue-import/anu-programs-courses.ts";

const CACHE_DIRECTORY = ".catalogue-cache";
const DEFAULT_CATALOGUE_YEAR = 2026;
const usage = `Usage:
  npm run catalogue:fetch -- --year 2026 --all-courses --output .catalogue-cache/anu-2026.json
  npm run catalogue:fetch -- --course COMP1100 --stdout

Options:
  --year YYYY        Catalogue year to fetch (default ${DEFAULT_CATALOGUE_YEAR}).
  --all-courses      Discover and fetch every course published for the year.
  --course CODE      Fetch a specific course. Repeat to fetch several courses.
  --concurrency N    Parallel page fetches, 1 to 8 (default 4).
  --output PATH      Write a new JSON manifest inside .catalogue-cache/.
  --stdout           Print the JSON manifest instead of writing a file.
  --help, -h         Show this help text.

Without --course or --all-courses the scope is the 44 pinned Coursemap
courses, including every course referenced by the authoritative 2026 BCOMP
and SOFT-MAJ structures. This command fetches official ANU pages only and
never writes to a database.`;

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
  let allCourses = false;
  let year;
  let concurrency;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      return {
        help: true,
        courses: [],
        output: undefined,
        stdout: false,
        allCourses: false,
        year: DEFAULT_CATALOGUE_YEAR,
        concurrency: undefined,
      };
    }
    if (argument === "--stdout") {
      if (stdout) throw new Error("--stdout may be supplied only once.");
      stdout = true;
      continue;
    }
    if (argument === "--all-courses") {
      if (allCourses)
        throw new Error("--all-courses may be supplied only once.");
      allCourses = true;
      continue;
    }
    if (
      argument === "--output" ||
      argument === "--course" ||
      argument === "--year" ||
      argument === "--concurrency"
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.\n\n${usage}`);
      }
      index += 1;
      if (argument === "--output") {
        if (output) throw new Error("--output may be supplied only once.");
        output = value;
      } else if (argument === "--course") {
        courses.push(value);
      } else if (argument === "--year") {
        if (year !== undefined)
          throw new Error("--year may be supplied only once.");
        if (!/^\d{4}$/.test(value.trim())) {
          throw new Error(`--year requires a four-digit year.\n\n${usage}`);
        }
        year = Number.parseInt(value.trim(), 10);
      } else {
        if (concurrency !== undefined)
          throw new Error("--concurrency may be supplied only once.");
        concurrency = Number.parseInt(value, 10);
        if (
          !Number.isInteger(concurrency) ||
          concurrency < 1 ||
          concurrency > 8
        ) {
          throw new Error(
            `--concurrency requires an integer between 1 and 8.\n\n${usage}`,
          );
        }
      }
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n\n${usage}`);
  }

  if (stdout === Boolean(output)) {
    throw new Error(`Choose exactly one of --output or --stdout.\n\n${usage}`);
  }
  if (allCourses && courses.length > 0) {
    throw new Error(
      `--all-courses cannot be combined with --course.\n\n${usage}`,
    );
  }
  return {
    help: false,
    courses,
    output,
    stdout,
    allCourses,
    year: year ?? DEFAULT_CATALOGUE_YEAR,
    concurrency,
  };
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

async function resolveScope(options) {
  if (options.courses.length > 0) {
    return { courseCodes: options.courses, directoryDiagnostics: [] };
  }
  if (!options.allCourses) {
    return {
      courseCodes: [...ANU_2026_COURSE_CODES],
      directoryDiagnostics: [],
    };
  }

  console.error(`Discovering all ${options.year} courses...`);
  const directory = await fetchAnuCourseDirectory(options.year);
  console.error(
    `Discovered ${directory.courseCodes.length} courses for ${options.year}.`,
  );
  const errors = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  if (errors.length > 0) {
    throw new Error(
      `Course discovery failed:\n- ${errors.map((error) => error.message).join("\n- ")}`,
    );
  }
  return {
    courseCodes: directory.courseCodes,
    directoryDiagnostics: directory.diagnostics,
  };
}

async function main() {
  requireSupportedNode();
  const options = parseFetchArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const { courseCodes } = await resolveScope(options);
  const progressStep = courseCodes.length > 200 ? 100 : 25;
  const manifest = await fetchAnuCourseManifest({
    catalogueYear: options.year,
    courseCodes,
    ...(options.concurrency ? { concurrency: options.concurrency } : {}),
    onProgress: ({ completed, total }) => {
      if (completed % progressStep === 0 || completed === total) {
        console.error(`Fetched ${completed}/${total} course pages...`);
      }
    },
  });
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
