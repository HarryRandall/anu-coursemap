#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { discoverAnuCourseCodes } from "../../lib/catalogue-import/anu-course-discovery.ts";
import { fetchAnuCourseManifest } from "../../lib/catalogue-import/anu-programs-courses.ts";
import { importCatalogueManifest } from "./lib/importer.mjs";
import { createHostedCatalogueDatabaseClient } from "./lib/local-database.mjs";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;
const usage = `Usage: npm run catalogue:sync -- [options]

Fetches and imports official ANU course pages through an explicitly configured
hosted Supabase connection. This command is for the protected CI runner only.

Options:
  --year YEAR                 Catalogue year (default: 2026)
  --course CODE               Sync one course. Repeat to specify a scope.
  --batch-size COUNT          Courses per database transaction (default: 20)
  --start-offset COUNT        Skip this many discovered courses (default: 0)
  --max-batches COUNT         Stop after this many batches (default: all)
  --requests-per-minute COUNT Maximum ANU fetch starts per minute (default: 60)
  --help, -h                  Show this help text.

Set COURSEMAP_IMPORT_DATABASE_URL to the protected Supabase PostgreSQL URL.
Use --start-offset and --max-batches to resume a partial full-catalogue run.`;

function parsePositiveInteger(value, option, { allowZero = false } = {}) {
  if (!/^\d+$/.test(value)) throw new Error(`${option} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (allowZero ? 0 : 1)) {
    throw new Error(
      `${option} must be ${allowZero ? "zero or a positive" : "a positive"} integer.`,
    );
  }
  return parsed;
}

export function parseSyncArguments(args) {
  const courseCodes = [];
  const options = {
    batchSize: 20,
    catalogueYear: 2026,
    courseCodes,
    maxBatches: undefined,
    requestsPerMinute: 60,
    startOffset: 0,
  };
  const optionsWithValues = new Set([
    "--year",
    "--course",
    "--batch-size",
    "--start-offset",
    "--max-batches",
    "--requests-per-minute",
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!optionsWithValues.has(argument)) {
      throw new Error(`Unknown argument: ${argument}\n\n${usage}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.\n\n${usage}`);
    }
    index += 1;

    if (argument === "--course") {
      const code = value.trim().toUpperCase();
      if (!COURSE_CODE_PATTERN.test(code)) {
        throw new Error(`${argument} must be a valid ANU course code.`);
      }
      courseCodes.push(code);
      continue;
    }

    const parsed = parsePositiveInteger(value, argument, {
      allowZero: argument === "--start-offset",
    });
    if (argument === "--year") options.catalogueYear = parsed;
    if (argument === "--batch-size") options.batchSize = parsed;
    if (argument === "--start-offset") options.startOffset = parsed;
    if (argument === "--max-batches") options.maxBatches = parsed;
    if (argument === "--requests-per-minute")
      options.requestsPerMinute = parsed;
  }

  if (options.catalogueYear < 2014 || options.catalogueYear > 2026) {
    throw new Error("--year must be between 2014 and 2026.");
  }
  if (options.batchSize > 100) {
    throw new Error("--batch-size must not exceed 100.");
  }
  if (options.requestsPerMinute > 120) {
    throw new Error("--requests-per-minute must not exceed 120.");
  }

  options.courseCodes = [...new Set(courseCodes)].sort((left, right) =>
    left.localeCompare(right),
  );
  return { help: false, ...options };
}

export function createRateLimitedFetch(fetchImpl, requestsPerMinute) {
  const minimumIntervalMs = Math.ceil(60_000 / requestsPerMinute);
  let nextStartAt = 0;
  let reservation = Promise.resolve();

  return async (...args) => {
    const start = reservation.then(async () => {
      const waitMs = Math.max(0, nextStartAt - Date.now());
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      nextStartAt = Date.now() + minimumIntervalMs;
    });
    reservation = start.catch(() => undefined);
    await start;
    return fetchImpl(...args);
  };
}

function batch(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

function requireImportDatabaseUrl(env = process.env) {
  const connectionString = env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "COURSEMAP_IMPORT_DATABASE_URL must be set by the protected catalogue runner.",
    );
  }
  return connectionString;
}

export async function syncAnuCatalogue(
  options,
  {
    createDatabaseClient = createHostedCatalogueDatabaseClient,
    discoverCourseCodes = discoverAnuCourseCodes,
    fetchCourseManifest = fetchAnuCourseManifest,
    fetchImpl = fetch,
    log = console.log,
  } = {},
) {
  const allCourseCodes =
    options.courseCodes.length > 0
      ? options.courseCodes
      : await discoverCourseCodes({
          catalogueYear: options.catalogueYear,
          fetchImpl,
        });
  const scopedCodes = allCourseCodes.slice(options.startOffset);
  const batches = batch(scopedCodes, options.batchSize).slice(
    0,
    options.maxBatches,
  );
  const rateLimitedFetch = createRateLimitedFetch(
    fetchImpl,
    options.requestsPerMinute,
  );
  const sql = createDatabaseClient(requireImportDatabaseUrl());
  const totals = { added: 0, changed: 0, checked: 0, failed: 0, unchanged: 0 };

  try {
    for (const [index, courseCodes] of batches.entries()) {
      const manifest = await fetchCourseManifest({
        catalogueYear: options.catalogueYear,
        courseCodes,
        concurrency: Math.min(4, courseCodes.length),
        fetchImpl: rateLimitedFetch,
      });
      const result = await importCatalogueManifest(sql, manifest);
      for (const [key, value] of Object.entries(result.counts)) {
        totals[key] += value;
      }
      log(
        JSON.stringify({
          batch: index + 1,
          batches: batches.length,
          counts: result.counts,
          nextOffset: options.startOffset + (index + 1) * options.batchSize,
          runId: result.runId,
          status: result.status,
        }),
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  return {
    ...totals,
    discovered: allCourseCodes.length,
    nextOffset: Math.min(
      allCourseCodes.length,
      options.startOffset + batches.flat().length,
    ),
  };
}

async function main() {
  const options = parseSyncArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const result = await syncAnuCatalogue(options);
  console.log(
    JSON.stringify({
      complete: result.nextOffset >= result.discovered,
      result,
    }),
  );
  if (result.failed > 0) process.exitCode = 2;
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Catalogue sync failed.",
    );
    process.exitCode = 1;
  });
}
