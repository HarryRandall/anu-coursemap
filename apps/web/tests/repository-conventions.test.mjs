import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { checkRepository } from "../../../scripts/check-repository.mjs";

const roots = [];

function repository(files) {
  const root = mkdtempSync(join(tmpdir(), "coursemap-conventions-"));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return { root, files: Object.keys(files) };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

test("resolves local document links while ignoring examples and external destinations", () => {
  const input = repository({
    "docs/README.md":
      "[Guide](guide.md#naming) [Web](https://example.com)\n`[query](coordinates)`\n```md\n[example](missing.md)\n```\n",
    "docs/guide.md": "# Naming\n",
  });
  expect(checkRepository(input)).toEqual([]);
  rmSync(join(input.root, "docs/guide.md"));
  expect(checkRepository(input)).toEqual([
    "docs/README.md: missing linked file guide.md.",
  ]);
});

test("enforces authored source names without renaming route contracts or vendor code", () => {
  const input = repository({
    "apps/web/lib/courseLookup.ts": "",
    "apps/web/lib/course-lookup.ts": "",
    "apps/web/app/[courseCode]/page.tsx": "",
    "packages/ui/components/VendorWidget.tsx": "",
  });
  expect(checkRepository(input)).toEqual([
    "apps/web/lib/courseLookup.ts: use a kebab-case source filename.",
  ]);
});

test("rejects dependency drift and mismatched skill metadata", () => {
  const input = repository({
    "package.json": JSON.stringify({
      dependencies: {
        react: "catalog:",
        "@coursemap/ui": "workspace:*",
        zod: "^4.0.0",
      },
    }),
    ".agents/skills/example/SKILL.md":
      "---\nname: wrong\ndescription: A useful task.\n---\n",
  });
  expect(checkRepository(input)).toEqual([
    "package.json: zod must use catalog: or workspace:.",
    ".agents/skills/example/SKILL.md: provide a matching skill name and a description.",
  ]);
});
