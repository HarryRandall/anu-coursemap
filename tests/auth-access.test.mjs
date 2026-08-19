import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const projectRoot = new URL("../", import.meta.url);
const origin = "http://127.0.0.1:3218";
let server;

before(
  async () => {
    const nextBin = fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    );
    server = spawn(
      process.execPath,
      [nextBin, "start", "--hostname", "127.0.0.1", "--port", "3218"],
      {
        cwd: fileURLToPath(projectRoot),
        env: {
          ...process.env,
          NODE_ENV: "production",
          COURSEMAP_DEMO_MODE: "false",
          NEXT_PUBLIC_SITE_URL: origin,
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let diagnostics = "";
    server.stdout.on("data", (chunk) => {
      diagnostics += chunk;
    });
    server.stderr.on("data", (chunk) => {
      diagnostics += chunk;
    });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) {
        throw new Error(
          `Next.js exited before it became ready:\n${diagnostics}`,
        );
      }
      try {
        const response = await fetch(`${origin}/login`);
        if (response.ok) return;
      } catch {
        // The server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Timed out waiting for Next.js:\n${diagnostics}`);
  },
  { timeout: 30_000 },
);

after(() => {
  server?.kill("SIGTERM");
});

function request(path, init = {}) {
  return fetch(`${origin}${path}`, init);
}

test("keeps anonymous public routes available without demo data", async () => {
  const responses = await Promise.all(
    [
      "/",
      "/courses",
      "/courses/COMP2100",
      "/key-dates",
      "/login",
      "/signup",
    ].map((path) => request(path, { headers: { accept: "text/html" } })),
  );

  responses.forEach((response) => assert.equal(response.status, 200));

  const html = (
    await Promise.all(responses.map((response) => response.text()))
  ).join("\n");
  assert.doesNotMatch(html, /Harry Student/i);
  assert.doesNotMatch(html, /u7499609/i);
  assert.doesNotMatch(html, /Admin console/i);
});

test("renders password authentication without magic-link instructions", async () => {
  const response = await request("/login?next=%2Fplan");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /name="email"/i);
  assert.match(html, /name="password"/i);
  assert.match(html, /autocomplete="current-password"/i);
  assert.match(html, /Create an account/i);
  assert.doesNotMatch(html, /magic link|Mailpit|one-time email link/i);
});

test("redirects protected routes to the canonical login page", async () => {
  for (const path of [
    "/plan?year=2026",
    "/profile",
    "/dashboard",
    "/onboarding",
    "/requirements",
    "/academic",
    "/calendar",
    "/roadmap",
    "/rooms",
    "/help",
    "/history",
    "/timetable",
    "/admin/courses",
    "/admin/courses/COMP3600",
    "/admin/users",
    "/admin/roles",
    "/admin/users/70000000-0000-4000-8000-000000000001",
  ]) {
    const response = await request(path, { redirect: "manual" });

    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location"), origin);
    assert.equal(location.origin, origin);
    assert.equal(location.pathname, "/login");
    assert.equal(location.searchParams.get("next"), path);
    assert.equal(location.searchParams.get("reason"), null);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  }
});

test("redirects legacy auth pages to the canonical public paths", async () => {
  const [loginResponse, signupResponse] = await Promise.all([
    request("/auth/sign-in?next=%2Fplan", { redirect: "manual" }),
    request("/auth/sign-up?next=%2Fonboarding", { redirect: "manual" }),
  ]);

  assert.equal(loginResponse.status, 308);
  assert.equal(signupResponse.status, 308);
  assert.equal(loginResponse.headers.get("location"), "/login?next=%2Fplan");
  assert.equal(
    signupResponse.headers.get("location"),
    "/signup?next=%2Fonboarding",
  );
});

test("does not expose logout over GET", async () => {
  const response = await request("/auth/logout", { redirect: "manual" });
  assert.equal(response.status, 405);
});

test("keeps public and built static assets outside authentication", async () => {
  const homeResponse = await request("/", {
    headers: { accept: "text/html" },
  });
  const homeHtml = await homeResponse.text();
  const builtAssetPath = homeHtml.match(
    /(?:src|href)="(\/_next\/static\/[^"? ]+)/,
  )?.[1];
  assert.ok(builtAssetPath, "expected a built Next.js static asset");

  const [publicAsset, builtAsset] = await Promise.all([
    request("/icon-32.png", { redirect: "manual" }),
    request(builtAssetPath, { redirect: "manual" }),
  ]);

  assert.equal(publicAsset.status, 200);
  assert.equal(builtAsset.status, 200);
  assert.equal(publicAsset.headers.get("location"), null);
  assert.equal(builtAsset.headers.get("location"), null);
});
