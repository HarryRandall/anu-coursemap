import { test, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";

const sharedRoot = new URL("../../../packages/ui/", import.meta.url);
test("shared UI has no imports from the web application", async () => {
  const files = await readdir(sharedRoot, { recursive: true });
  for (const file of files.filter(
    (file) => /\.(ts|tsx)$/.test(file) && !file.includes("node_modules"),
  )) {
    const source = await readFile(new URL(file, sharedRoot), "utf8");
    expect(source, file).not.toMatch(
      /(?:from\s*|import\s*\()["'](?:@\/|[^"']*apps\/web)/,
    );
  }
});

test("application modules do not import local seed or test fixtures", async () => {
  for (const directory of ["app", "lib", "ui"]) {
    const root = new URL(`../${directory}/`, import.meta.url);
    const files = await readdir(root, { recursive: true });
    for (const file of files.filter((name) => /\.(ts|tsx)$/.test(name))) {
      const source = await readFile(new URL(file, root), "utf8");
      expect(source, `${directory}/${file}`).not.toMatch(
        /(?:from\s*|import\s*\()["'][^"']*(?:tests|scripts)\/fixtures\//,
      );
    }
  }
});
