import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const projectRoot = new URL("../", import.meta.url);
const origin = "http://127.0.0.1:3217";
let server;

before(async () => {
  const nextBin = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url),
  );
  server = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", "3217"], {
    cwd: fileURLToPath(projectRoot),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let diagnostics = "";
  server.stdout.on("data", (chunk) => { diagnostics += chunk; });
  server.stderr.on("data", (chunk) => { diagnostics += chunk; });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before it became ready:\n${diagnostics}`);
    }
    try {
      const response = await fetch(`${origin}/plan`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for Next.js:\n${diagnostics}`);
}, { timeout: 30_000 });

after(() => {
  server?.kill("SIGTERM");
});

async function render(path = "/plan") {
  return fetch(`${origin}${path}`, {
    headers: { accept: "text/html" },
  });
}

test("server-renders the routed Coursemap degree planner", async () => {
  const response = await render("/plan");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Coursemap · Your ANU degree, mapped/i);
  assert.match(html, /coursemap/i);
  assert.match(html, /Course plan/i);
  assert.doesNotMatch(html, /Bachelor of Computing/i);
  assert.doesNotMatch(html, /Software Development/i);
  assert.match(html, /COMP1100/i);
  assert.match(html, /class="year-row"/i);
  assert.match(html, /Semester 2/i);
  assert.equal((html.match(/Add course in empty slot/g) ?? []).length, 17);
  assert.doesNotMatch(html, /Edit degree/i);
  assert.doesNotMatch(html, /18 of 144 units completed/i);
  assert.doesNotMatch(html, /48 mapped/i);
  assert.match(html, /Admin console/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders admin and course-detail routes", async () => {
  const [adminResponse, adminCoursesResponse, relationsResponse, courseResponse, chainResponse] = await Promise.all([
    render("/admin/dashboard"),
    render("/admin/courses"),
    render("/admin/relations"),
    render("/courses/COMP2100"),
    render("/courses/COMP3670"),
  ]);
  assert.equal(adminResponse.status, 200);
  assert.equal(adminCoursesResponse.status, 200);
  assert.equal(relationsResponse.status, 200);
  assert.equal(courseResponse.status, 200);
  assert.equal(chainResponse.status, 200);
  const adminHtml = await adminResponse.text();
  const adminCoursesHtml = await adminCoursesResponse.text();
  const relationsHtml = await relationsResponse.text();
  assert.match(adminHtml, /Catalogue health at a glance/i);
  assert.doesNotMatch(adminHtml, /Start scoped sync/i);
  assert.doesNotMatch(adminHtml, /Catalogue data tools/i);
  assert.doesNotMatch(adminHtml, /Search courses|Help &amp; support/i);
  assert.doesNotMatch(adminCoursesHtml, /Export CSV|Reparse selected/i);
  assert.doesNotMatch(relationsHtml, />Table<|>Graph</i);
  assert.match(relationsHtml, /Open prerequisite graph for COMP2100/i);
  const courseHtml = await courseResponse.text();
  assert.match(courseHtml, /Software Design Methodologies/i);
  assert.match(courseHtml, /Requisites and compatibility/i);
  assert.doesNotMatch(courseHtml, /Back to courses/i);
  const chainHtml = await chainResponse.text();
  assert.match(chainHtml, /Full prerequisite chain/i);
  for (const prerequisite of ["MATH1005", "COMP2100", "COMP1110", "COMP1100"]) {
    assert.match(chainHtml, new RegExp(prerequisite));
  }
});

test("removes the disposable starter and keeps product metadata", async () => {
  const [planPage, adminPage, coursePage, prereqGraph, courseDrawer, coursePicker, providers, catalogue, globals, appShell, sidebar, topbar, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/plan/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/courses/[code]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/prereq-graph.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/overlays/course-drawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/overlays/course-picker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/providers.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/catalogue.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/shell/app-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shell/sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/shell/topbar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(planPage, /year-board/);
  assert.match(planPage, /STANDARD_COURSE_SLOTS = 4/);
  assert.match(planPage, /This semester is already full/);
  assert.match(planPage, /reorderAttempt/);
  assert.match(planPage, /Move anyway/);
  assert.match(planPage, /CourseDrawer/);
  assert.match(planPage, /onPointerDown/);
  assert.match(planPage, /dragPreview/);
  assert.match(planPage, /previewUsesEmptySlot/);
  assert.match(planPage, /style=\{\{ height: dragPointer\?\.rowHeight \}\}/);
  assert.match(planPage, /animate-drop-slot-in/);
  assert.match(planPage, /translate3d/);
  assert.match(planPage, /role="tooltip"/);
  assert.match(planPage, /group-hover:visible/);
  assert.doesNotMatch(planPage, /Blocked: needs/);
  assert.match(adminPage, /Changed pages/);
  assert.match(coursePage, /completedCodes/);
  assert.match(coursePage, /plannedCodes/);
  assert.match(coursePage, /prerequisiteChainCodes/);
  assert.match(coursePage, /ring-rose-200/);
  assert.doesNotMatch(coursePage, /> Parsed</);
  assert.match(prereqGraph, /completedCodes\.has\(item\)/);
  assert.match(prereqGraph, /bg-emerald-50 text-emerald-700/);
  assert.match(prereqGraph, /isPlanned/);
  assert.match(prereqGraph, /bg-white text-zinc-600 ring-1 ring-zinc-200/);
  assert.match(prereqGraph, /bg-rose-50 text-rose-700/);
  assert.doesNotMatch(prereqGraph, /bg-rose-50\/40/);
  assert.match(prereqGraph, /No prerequisite courses/);
  assert.match(prereqGraph, /empty-prerequisite-edge/);
  assert.match(prereqGraph, /stroke-zinc-300/);
  assert.doesNotMatch(coursePage, /Back to courses/);
  assert.doesNotMatch(courseDrawer, /Move course to|\bmoveAttempt\b/);
  assert.doesNotMatch(courseDrawer, />Undo</);
  assert.match(courseDrawer, />\s*Completed\s*</);
  assert.match(courseDrawer, /attempt\.status === "completed" \? "planned" : "completed"/);
  assert.match(courseDrawer, /grid grid-cols-3 gap-2/);
  assert.match(courseDrawer, /must be completed or planned earlier/);
  assert.match(courseDrawer, />Requisites</);
  assert.match(courseDrawer, /bg-rose-50 text-rose-700 ring-rose-200/);
  assert.match(courseDrawer, /!ring-emerald-300 hover:!bg-emerald-50/);
  assert.match(courseDrawer, /hover:!bg-rose-50 hover:!text-rose-700/);
  assert.match(courseDrawer, /More course information/);
  assert.match(courseDrawer, /View assessment, learning outcomes and the complete course record/);
  assert.doesNotMatch(courseDrawer, /Course information|Action needed|✓/);
  assert.match(coursePicker, /courseOccurrenceLimit\(course\.code\)/);
  assert.doesNotMatch(coursePicker, /In plan/);
  assert.match(providers, /normaliseAttempts/);
  assert.match(providers, /courseOccurrenceLimit\(courseCode\)/);
  assert.match(catalogue, /units === 12 \? 2 : 1/);
  assert.match(catalogue, /function prerequisiteChainCodes/);
  assert.match(globals, /scrollbar-gutter: stable/);
  assert.doesNotMatch(appShell, /max-w-\[1440px\]/);
  assert.match(appShell, /min-w-0 w-full max-w-none/);
  assert.match(appShell, /!fullBleed && "px-4/);
  assert.match(sidebar, /\/admin\/dashboard/);
  assert.match(sidebar, /!admin &&/);
  assert.match(topbar, /after:inset-x-0/);
  assert.match(providers, /fixed right-4 top-4/);
  assert.match(layout, /Coursemap/);
  assert.match(layout, /og\.png/);
  assert.match(packageJson, /"name": "anu-coursemap"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
  await access(new URL("../public/og.png", import.meta.url));
});
