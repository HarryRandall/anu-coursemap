#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { seedLocalPreview } from "./seed-preview.mjs";

export function resetLocalDatabase({ spawnCommand = spawn } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(
      "supabase",
      ["db", "reset", "--local", "--no-seed"],
      { stdio: "inherit" },
    );

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `Local Supabase reset stopped with signal ${signal}.`
            : `Local Supabase reset exited with code ${code ?? "unknown"}.`,
        ),
      );
    });
  });
}

export async function resetLocalPreview({
  args = [],
  resetDatabase = resetLocalDatabase,
  seedPreview = seedLocalPreview,
} = {}) {
  if (args.length > 0) {
    throw new Error(
      "The local preview reset does not accept extra Supabase CLI arguments.",
    );
  }

  await resetDatabase();
  await seedPreview();
}

const isMainModule = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1]
  : false;

if (isMainModule) {
  await resetLocalPreview({ args: process.argv.slice(2) });
  console.log("Reset and seeded the local Coursemap preview database.");
}
