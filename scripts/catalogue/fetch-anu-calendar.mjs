#!/usr/bin/env node

import { open, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  fetchUniversityCalendarManifest,
  universityCalendarErrorDiagnostics,
} from "../../lib/catalogue-import/anu-university-calendar.ts";
import { resolveManifestOutputPath } from "./lib/manifest-output.mjs";

const usage = `Usage:
  npm run calendar:fetch -- --year 2026 --output .catalogue-cache/anu-calendar-2026.json
  npm run calendar:fetch -- --year 2026 --stdout

Options:
  --year YYYY     The calendar year to fetch. Defaults to the current year.
  --output PATH   Write a new JSON manifest inside .catalogue-cache/.
  --stdout        Print the JSON manifest instead of writing a file.
  --help, -h      Show this help text.

This command fetches the official ANU university calendar HTML only and never
writes to a database. Import the manifest with npm run calendar:import.`;

function requireSupportedNode() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(major) || major < 24) {
    throw new Error(
      "The calendar source fetcher requires Node.js 24 or newer.",
    );
  }
}

export function parseCalendarFetchArguments(args, currentYear) {
  let year = currentYear;
  let output;
  let stdout = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      return { help: true, year, output: undefined, stdout: false };
    }
    if (argument === "--stdout") {
      if (stdout) throw new Error("--stdout may be supplied only once.");
      stdout = true;
      continue;
    }
    if (argument === "--output" || argument === "--year") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.\n\n${usage}`);
      }
      index += 1;
      if (argument === "--output") {
        if (output) throw new Error("--output may be supplied only once.");
        output = value;
      } else {
        if (!/^\d{4}$/u.test(value.trim())) {
          throw new Error(`--year must be a four digit year.\n\n${usage}`);
        }
        year = Number.parseInt(value.trim(), 10);
      }
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n\n${usage}`);
  }

  if (stdout === Boolean(output)) {
    throw new Error(`Choose exactly one of --output or --stdout.\n\n${usage}`);
  }
  return { help: false, year, output, stdout };
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
  const options = parseCalendarFetchArguments(
    process.argv.slice(2),
    new Date().getFullYear(),
  );
  if (options.help) {
    console.log(usage);
    return;
  }

  const signal = AbortSignal.timeout(60_000);
  const manifest = await fetchUniversityCalendarManifest({
    calendarYear: options.year,
    signal,
  });
  const contents = `${JSON.stringify(manifest, null, 2)}\n`;

  if (options.stdout) {
    process.stdout.write(contents);
  } else {
    const outputPath = resolveManifestOutputPath(options.output);
    await writeNewManifest(outputPath, contents);
    console.error(
      `Wrote ${manifest.events.length} calendar events for ${options.year} to ${outputPath}`,
    );
  }

  const errors = universityCalendarErrorDiagnostics(manifest);
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
      error instanceof Error ? error.message : "Calendar source fetch failed.",
    );
    process.exitCode = 1;
  });
}
