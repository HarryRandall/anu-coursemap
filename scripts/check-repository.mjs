import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Checks authored files only; generated assets and vendored UI keep their own conventions. */
export function checkRepository({ root, files }) {
  const errors = [];
  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;

    if (
      /^(?:apps\/web\/(?:lib|ui|scripts|tests)|scripts)\//.test(file) &&
      /\.(?:ts|tsx|mjs)$/.test(file) &&
      !/^[a-z0-9]+(?:[-.][a-z0-9]+)*\.(?:ts|tsx|mjs)$/.test(basename(file))
    ) {
      errors.push(`${file}: use a kebab-case source filename.`);
    }

    if (file.endsWith("package.json")) {
      const manifest = JSON.parse(readFileSync(path, "utf8"));
      for (const field of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
      ]) {
        for (const [name, version] of Object.entries(manifest[field] ?? {})) {
          if (version !== "catalog:" && !version.startsWith("workspace:")) {
            errors.push(`${file}: ${name} must use catalog: or workspace:.`);
          }
        }
      }
    }

    if (!file.endsWith(".md") || file.startsWith("packages/ui/")) continue;
    const source = readFileSync(path, "utf8");
    if (file.endsWith("/SKILL.md")) {
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const name = frontmatter?.[1].match(/^name:\s*(.+)$/m)?.[1].trim();
      const description = frontmatter?.[1]
        .match(/^description:\s*(.+)$/m)?.[1]
        .trim();
      if (name !== basename(dirname(file)) || !description) {
        errors.push(
          `${file}: provide a matching skill name and a description.`,
        );
      }
    }

    // Check inline Markdown file destinations, not examples inside fenced code blocks.
    const prose = source
      .replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "")
      .replace(/`[^`\n]+`/g, "");
    for (const match of prose.matchAll(
      /\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g,
    )) {
      const target = match[1].replace(/^<|>$/g, "");
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue;
      const destination = decodeURIComponent(target.split(/[?#]/)[0]);
      if (!existsSync(resolve(dirname(path), destination))) {
        errors.push(`${file}: missing linked file ${destination}.`);
      }
    }
  }
  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--deduplicate",
      "-z",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  const errors = checkRepository({ root, files });
  for (const error of errors) console.error(error);
  if (errors.length) process.exitCode = 1;
  else
    console.log(
      "Repository naming, dependency references, skill metadata and Markdown file links passed.",
    );
}
