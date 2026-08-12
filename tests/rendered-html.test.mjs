import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(path = "/plan") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", host: "coursemap.example" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the routed Coursemap degree planner", async () => {
  const response = await render("/plan");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Coursemap · Your ANU degree, mapped/i);
  assert.match(html, /coursemap/i);
  assert.match(html, /Course plan/i);
  assert.match(html, /Bachelor of Computing/i);
  assert.match(html, /Software Development/i);
  assert.match(html, /COMP1100/i);
  assert.match(html, /class="year-row"/i);
  assert.match(html, /Semester 2/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders admin and course-detail routes", async () => {
  const [adminResponse, courseResponse] = await Promise.all([
    render("/admin"),
    render("/courses/COMP2100"),
  ]);
  assert.equal(adminResponse.status, 200);
  assert.equal(courseResponse.status, 200);
  assert.match(await adminResponse.text(), /Catalogue health at a glance/i);
  const courseHtml = await courseResponse.text();
  assert.match(courseHtml, /Software Design Methodologies/i);
  assert.match(courseHtml, /Requisites and compatibility/i);
});

test("removes the disposable starter and keeps product metadata", async () => {
  const [planPage, adminPage, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/plan/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(planPage, /year-board/);
  assert.match(planPage, /CourseDrawer/);
  assert.match(planPage, /onDrop/);
  assert.match(adminPage, /Changed pages/);
  assert.match(layout, /Coursemap/);
  assert.match(layout, /og\.png/);
  assert.match(packageJson, /"name": "anu-degree-roadmap"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
  await access(new URL("../public/og.png", import.meta.url));
});
