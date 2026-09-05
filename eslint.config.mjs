import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  globalIgnores([
    ".next/**",
    "build/**",
    "coverage/**",
    "dist/**",
    "next-env.d.ts",
    "out/**",
    "public/maplibre/**",
    // Untitled UI source is vendored verbatim from untitleduico/react. Linting
    // third-party source against this project's rules would force edits that
    // break the byte comparison proving it has not drifted.
    "components/design-system/untitled/**",
    // ReUI's MIT source follows its own lint conventions. Local adapters and
    // laboratory integration remain covered by this project's checks.
    "components/design-system/reui/components/**",
    "components/design-system/reui/catalogue/**",
    "components/design-system/reui/catalogue-data/**",
    "components/design-system/reui/examples/**",
    "components/design-system/reui/hooks/**",
    "components/design-system/reui/ui/**",
  ]),
]);
