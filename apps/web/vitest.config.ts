import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const alias = { "@": fileURLToPath(new URL("./", import.meta.url)) };
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.{ts,mjs}"],
          exclude: ["tests/**/*database.test.{ts,mjs}"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
          setupFiles: ["./tests/setup-component.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "database",
          environment: "node",
          include: ["tests/**/*database.test.{ts,mjs}"],
          fileParallelism: false,
          testTimeout: 30000,
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
  },
});
