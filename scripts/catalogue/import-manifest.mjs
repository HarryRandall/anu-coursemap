#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { importCatalogueManifest } from "./lib/importer.mjs";
import { createLocalDatabaseClient } from "./lib/local-database.mjs";

const usage = `Usage: npm run catalogue:import -- <manifest.json>

Imports a validated catalogue manifest into the local Supabase database.
Set COURSEMAP_DATABASE_URL to override local supabase/config.toml discovery.`;

function requireSupportedNode() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(major) || major < 24) {
    throw new Error("The catalogue importer requires Node.js 24 or newer.");
  }
}

async function readManifest(path) {
  let contents;
  try {
    contents = await readFile(resolve(path), "utf8");
  } catch {
    throw new Error("The catalogue manifest file could not be read.");
  }

  try {
    return JSON.parse(contents);
  } catch {
    throw new Error("The catalogue manifest file is not valid JSON.");
  }
}

export function importResultExitCode(result) {
  return result?.status === "succeeded" ? 0 : 2;
}

async function main() {
  requireSupportedNode();

  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log(usage);
    return;
  }

  if (args.length !== 1 || args[0].startsWith("-")) {
    throw new Error(usage);
  }

  const rawManifest = await readManifest(args[0]);
  const { parseCatalogueManifest } =
    await import("../../lib/catalogue-import/manifest.ts");
  const manifest = parseCatalogueManifest(rawManifest);
  const sql = await createLocalDatabaseClient();

  try {
    const result = await importCatalogueManifest(sql, manifest);
    console.log(JSON.stringify(result, null, 2));
    const exitCode = importResultExitCode(result);
    if (exitCode !== 0) {
      console.error(
        "The catalogue import failed; review the recorded run details.",
      );
      process.exitCode = exitCode;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    if (Array.isArray(error?.issues)) {
      console.error(
        `Catalogue manifest validation failed:\n- ${error.issues.join("\n- ")}`,
      );
    } else {
      console.error(
        error instanceof Error ? error.message : "Catalogue import failed.",
      );
    }
    process.exitCode = 1;
  });
}
