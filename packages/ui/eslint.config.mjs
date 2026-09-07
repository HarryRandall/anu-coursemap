import { defineConfig, globalIgnores } from "eslint/config";
import nextTypeScript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextTypeScript,
  globalIgnores(["primitives/**", "components/**", "hooks/**"]),
  {
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/*", "**/apps/**"] }],
    },
  },
]);
