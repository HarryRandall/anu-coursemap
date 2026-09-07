import { defineConfig, globalIgnores } from "eslint/config";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextTypeScript,
  // Vendored ReUI sources keep their upstream style so they stay diffable
  // against the registry. Their dependency direction is still checked, by
  // apps/web/tests/workspace-boundaries.test.mjs, which reads every file here.
  globalIgnores(["primitives/**", "components/**", "hooks/**"]),
  {
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/*", "**/apps/**"] }],
    },
  },
]);
