import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const LIB_SPECIFIER = /(["'])(@\/lib\/[\w./-]+|\.{1,2}\/[\w./-]+)\1/g;

/**
 * Resolves an import specifier written inside `lib/<from>.ts` to another
 * `lib/`-relative module path, or null when it points somewhere this harness
 * does not compile.
 */
function resolveLibSpecifier(specifier, from) {
  if (specifier.startsWith("@/lib/")) return specifier.slice("@/lib/".length);
  if (!specifier.startsWith(".")) return null;
  const resolved = normalize(join(dirname(from), specifier));
  return resolved.startsWith("..") ? null : resolved;
}

/**
 * Compiles `lib/**` TypeScript modules into a temporary directory and imports
 * them. Components are never unit tested in this repo, so every assertion runs
 * against these pure modules.
 *
 * Only entry points need naming: imports between `lib/` modules are followed
 * and compiled too, so adding a dependency to a module under test does not mean
 * editing every test that loads it. An import that leaves `lib/` is left alone
 * and will fail loudly at import time rather than resolving to something stale.
 */
export async function loadLibModules(entryPaths, label = "lib") {
  const directory = await mkdtemp(join(tmpdir(), `coursemap-${label}-`));
  const compiled = new Map();
  const pending = [...entryPaths];

  while (pending.length > 0) {
    const path = pending.pop();
    if (compiled.has(path)) continue;

    const source = await readFile(
      new URL(`../../lib/${path}.ts`, import.meta.url),
      "utf8",
    );
    const output = ts
      .transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(LIB_SPECIFIER, (match, quote, specifier) => {
        const resolved = resolveLibSpecifier(specifier, path);
        if (!resolved) return match;
        pending.push(resolved);
        return `"./${basename(resolved)}.js"`;
      });

    compiled.set(path, output);
  }

  await Promise.all(
    [...compiled].map(([path, output]) =>
      writeFile(join(directory, `${basename(path)}.js`), output),
    ),
  );

  const names = [...compiled.keys()].map((path) => basename(path));
  const modules = await Promise.all(
    names.map(
      (name) => import(pathToFileURL(join(directory, `${name}.js`)).href),
    ),
  );
  return Object.fromEntries(names.map((name, index) => [name, modules[index]]));
}
