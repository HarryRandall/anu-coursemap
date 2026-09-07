import { localTestEnvironment } from "./scripts/local/test-environment.mjs";
import { defineConfig } from "@playwright/test";

const profile = process.env.COURSEMAP_TEST_PROFILE ?? "authenticated";
const port = profile === "access" ? 4318 : 4319;
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: profile,
      testMatch:
        profile === "authenticated"
          ? ["authenticated.spec.*", "rendered.spec.*"]
          : "access.spec.*",
    },
  ],
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    url: `${origin}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...(profile === "authenticated" ? localTestEnvironment() : {}),
      COURSEMAP_QUEUE_IMPORTS_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: origin,
      ...(profile === "access"
        ? {
            NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
          }
        : {}),
    },
  },
});
