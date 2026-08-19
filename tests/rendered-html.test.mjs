import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const projectRoot = new URL("../", import.meta.url);
const origin = "http://127.0.0.1:3217";
let server;

before(
  async () => {
    const nextBin = fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    );
    server = spawn(
      process.execPath,
      [nextBin, "start", "--hostname", "127.0.0.1", "--port", "3217"],
      {
        cwd: fileURLToPath(projectRoot),
        env: {
          ...process.env,
          NODE_ENV: "production",
          COURSEMAP_DEMO_MODE: "true",
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
        const response = await fetch(`${origin}/plan`);
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

async function render(path = "/plan") {
  return fetch(`${origin}${path}`, {
    headers: { accept: "text/html" },
  });
}

test("keeps the public entry, catalogue and authentication routes accessible", async () => {
  const [homeResponse, coursesResponse, signInResponse, signUpResponse] =
    await Promise.all([
      render("/"),
      render("/courses?q=COMP3900"),
      render("/login?next=%2F%2Fevil.example%2Fplan"),
      render("/signup"),
    ]);

  assert.equal(homeResponse.status, 200);
  assert.equal(coursesResponse.status, 200);
  assert.equal(signInResponse.status, 200);
  assert.equal(signUpResponse.status, 200);

  const homeHtml = await homeResponse.text();
  const coursesHtml = await coursesResponse.text();
  const signInHtml = await signInResponse.text();
  const signUpHtml = await signUpResponse.text();
  assert.match(homeHtml, /See how every course fits before you enrol/i);
  assert.match(homeHtml, /name="q"/i);
  assert.match(homeHtml, /Everything you need to plan with confidence/i);
  assert.match(homeHtml, /Coursemap product areas/i);
  assert.match(homeHtml, />Prerequisites<\/button>/i);
  assert.match(homeHtml, /Start with a course, then build the rest/i);
  assert.match(homeHtml, /Explore courses/i);
  assert.match(coursesHtml, /Showing .* of .* course/i);
  assert.match(coursesHtml, /Computing Project/i);
  assert.doesNotMatch(
    coursesHtml,
    /Search code, course name, school or convener/i,
  );
  assert.doesNotMatch(coursesHtml, /Open entry|6 units/i);
  assert.match(signInHtml, /Welcome back/i);
  assert.match(signInHtml, /name="next" value="\/dashboard"/i);
  assert.match(signInHtml, /name="email"/i);
  assert.match(signInHtml, /name="password"/i);
  assert.match(signInHtml, /Continue with Google/i);
  assert.match(signInHtml, /Continue with Microsoft/i);
  assert.match(signInHtml, /Create an account/i);
  assert.doesNotMatch(signInHtml, /magic link|Mailpit|one-time email link/i);
  assert.match(signUpHtml, /Create your account/i);
  assert.match(signUpHtml, /name="passwordConfirmation"/i);
  assert.match(signUpHtml, /Continue with Google/i);
  assert.match(signUpHtml, /Already have an account/i);
});

test("server-renders the complete student workspace", async () => {
  const paths = [
    "/dashboard",
    "/academic",
    "/calendar",
    "/key-dates",
    "/requirements",
    "/roadmap",
    "/rooms",
    "/help",
    "/help/build-your-plan",
  ];
  const responses = await Promise.all(paths.map((path) => render(path)));
  responses.forEach((response) => assert.equal(response.status, 200));

  const [
    dashboardHtml,
    academicHtml,
    calendarHtml,
    keyDatesHtml,
    requirementsHtml,
    roadmapHtml,
    roomsHtml,
    helpHtml,
    helpGuideHtml,
  ] = await Promise.all(responses.map((response) => response.text()));

  const studentNavigation =
    dashboardHtml.match(
      /<nav aria-label="Student navigation"[^>]*>([\s\S]*?)<\/nav>/i,
    )?.[1] ?? "";

  assert.ok(studentNavigation);
  [
    "Home",
    "Plan",
    "Courses",
    "Requirements",
    "Academic",
    "Calendar",
    "Key dates",
    "Roadmap",
    "Room finder",
  ].forEach((label) => assert.match(studentNavigation, new RegExp(label, "i")));
  assert.doesNotMatch(studentNavigation, /Overview|Planning|Your study|More/i);
  assert.doesNotMatch(studentNavigation, /Search courses/i);
  assert.match(dashboardHtml, /aria-label="Find courses"/i);
  assert.match(dashboardHtml, /Set up your plan first/i);
  assert.match(dashboardHtml, /Start onboarding/i);
  assert.doesNotMatch(
    dashboardHtml,
    /Semester load|Units over time|Degree complete/i,
  );
  assert.match(academicHtml, /Academic overview/i);
  assert.match(academicHtml, /recorded mark average/i);
  assert.doesNotMatch(academicHtml, /Your study record|Edit study details/i);
  assert.match(calendarHtml, /Plan calendar/i);
  assert.doesNotMatch(
    calendarHtml,
    /Study periods|Timetable times and rooms are not imported yet/i,
  );
  assert.doesNotMatch(
    calendarHtml,
    /Weekly timetable|Class timetable|Assessments and dates/i,
  );
  assert.doesNotMatch(calendarHtml, /Do not use this planning view/i);
  assert.match(keyDatesHtml, /Key dates/i);
  assert.match(keyDatesHtml, /No key dates published yet/i);
  assert.doesNotMatch(keyDatesHtml, /Official ANU academic calendar/i);
  assert.match(
    requirementsHtml,
    /Select a published degree in onboarding to begin/i,
  );
  assert.doesNotMatch(
    requirementsHtml,
    /Rule group coverage|possible matches|not an official graduation assessment/i,
  );
  assert.match(roadmapHtml, /Visual degree planning/i);
  assert.match(roadmapHtml, /The current product focus/i);
  assert.doesNotMatch(roadmapHtml, /<h1[^>]*>Roadmap<\/h1>/i);
  assert.doesNotMatch(
    roadmapHtml,
    /Where Coursemap is heading|Product direction/i,
  );
  assert.doesNotMatch(roadmapHtml, /Build the useful things first/i);
  assert.doesNotMatch(roadmapHtml, /Something important missing/i);
  assert.match(roomsHtml, /Building and room search/i);
  assert.doesNotMatch(
    roomsHtml,
    /Find the right room|Room Finder will connect/i,
  );
  assert.doesNotMatch(helpHtml, /How can we help|Coursemap support/i);
  assert.match(helpHtml, /Read guide/i);
  assert.match(helpHtml, /Email support/i);
  assert.match(helpHtml, /Use the study calendar/i);
  assert.match(helpHtml, /Read your academic record/i);
  assert.doesNotMatch(
    helpHtml,
    /Help topics|Short guides for the parts of Coursemap|Report a bug, flag catalogue data/i,
  );
  assert.doesNotMatch(helpHtml, /Common questions|Need official advice/i);
  assert.match(helpGuideHtml, /Build your plan/i);
  assert.match(helpGuideHtml, /Where are class times and rooms/i);
});

test("redirects legacy student routes to their replacements", async () => {
  const [historyResponse, timetableResponse] = await Promise.all([
    fetch(`${origin}/history`, { redirect: "manual" }),
    fetch(`${origin}/timetable`, { redirect: "manual" }),
  ]);

  assert.equal(historyResponse.status, 307);
  assert.equal(historyResponse.headers.get("location"), "/academic");
  assert.equal(timetableResponse.status, 307);
  assert.equal(timetableResponse.headers.get("location"), "/calendar");
});

test("keeps the key-dates experience continuous and data-driven", async () => {
  const [page, calendarView] = await Promise.all([
    readFile(new URL("../app/key-dates/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../components/key-dates/university-calendar-view.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(page, /loadPublishedUniversityCalendar/);
  assert.match(page, /decorateUniversityCalendarEvents/);
  assert.match(calendarView, /groupUniversityCalendarEventsByMonth/);
  assert.match(calendarView, /IntersectionObserver/);
  assert.match(calendarView, /Load more dates/);
  assert.doesNotMatch(calendarView, /Next up|Breakdown|MonthAgenda|monthCells/);
  assert.doesNotMatch(calendarView, /const events = \[/);
});

test("fails closed for malformed auth handlers and cross-origin logout", async () => {
  const [callbackResponse, confirmResponse, logoutResponse] = await Promise.all(
    [
      fetch(`${origin}/auth/callback?code=&code=duplicate`, {
        redirect: "manual",
      }),
      fetch(`${origin}/auth/confirm?token_hash=value&type=magiclink`, {
        redirect: "manual",
      }),
      fetch(`${origin}/auth/logout`, {
        method: "POST",
        headers: { origin: "https://evil.example" },
        redirect: "manual",
      }),
    ],
  );

  assert.equal(callbackResponse.status, 303);
  assert.equal(confirmResponse.status, 303);
  assert.equal(logoutResponse.status, 403);
  for (const response of [callbackResponse, confirmResponse, logoutResponse]) {
    assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  }
});

test("server-renders the routed Coursemap degree planner", async () => {
  const response = await render("/plan");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Coursemap · Your ANU degree, mapped/i);
  assert.match(html, /coursemap/i);
  assert.match(html, /Course plan/i);
  assert.match(html, /COMP1100/i);
  assert.match(html, /class="year-row"/i);
  assert.match(html, /Semester 2/i);
  const emptyAdds = (html.match(/Add course in empty slot/g) ?? []).length;
  assert.ok(emptyAdds > 0);
  assert.doesNotMatch(html, /Add recommended course [A-Z]{4}\d+/);
  assert.match(html, /Degree progress/i);
  assert.doesNotMatch(html, /Edit degree/i);
  assert.doesNotMatch(html, /18 of 144 units completed/i);
  assert.doesNotMatch(html, /48 mapped/i);
  assert.match(html, /Admin console/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders admin and course-detail routes", async () => {
  const [
    adminResponse,
    adminCoursesResponse,
    adminCourseReviewResponse,
    adminUsersResponse,
    adminRolesResponse,
    relationsResponse,
    courseResponse,
    chainResponse,
    summaryResponse,
  ] = await Promise.all([
    render("/admin/dashboard"),
    render("/admin/courses"),
    render("/admin/courses/COMP3600"),
    render("/admin/users"),
    render("/admin/roles"),
    render("/admin/relations"),
    render("/courses/COMP2100"),
    render("/courses/COMP3670"),
    render("/courses/COMP3600?tab=requisites"),
  ]);
  assert.equal(adminResponse.status, 200);
  assert.equal(adminCoursesResponse.status, 200);
  assert.equal(adminCourseReviewResponse.status, 200);
  assert.equal(adminUsersResponse.status, 200);
  assert.equal(adminRolesResponse.status, 200);
  assert.equal(relationsResponse.status, 200);
  assert.equal(courseResponse.status, 200);
  assert.equal(chainResponse.status, 200);
  assert.equal(summaryResponse.status, 200);
  const adminHtml = await adminResponse.text();
  const adminCoursesHtml = await adminCoursesResponse.text();
  const adminCourseReviewHtml = await adminCourseReviewResponse.text();
  const adminUsersHtml = await adminUsersResponse.text();
  const adminRolesHtml = await adminRolesResponse.text();
  const relationsHtml = await relationsResponse.text();
  assert.match(adminHtml, /Live catalogue status/i);
  assert.match(adminHtml, /Publication workflow/i);
  assert.doesNotMatch(adminHtml, /Start scoped sync/i);
  assert.doesNotMatch(adminHtml, /Catalogue data tools/i);
  assert.doesNotMatch(adminHtml, /Catalogue administration/i);
  assert.doesNotMatch(
    adminHtml,
    /Find courses|Search courses|Help &amp; support/i,
  );
  assert.doesNotMatch(adminCoursesHtml, /Export CSV|Reparse selected/i);
  assert.doesNotMatch(
    adminCoursesHtml,
    /Catalogue review|Open a course version|Search imported courses/i,
  );
  assert.match(adminCourseReviewHtml, /What to review before publishing/i);
  assert.match(adminCourseReviewHtml, /Course fields/i);
  assert.match(adminCourseReviewHtml, /Requisites and compatibility/i);
  assert.match(adminCourseReviewHtml, /24 units of COMP coded courses/i);
  assert.match(adminCourseReviewHtml, /Imported condition matrix/i);
  assert.match(adminUsersHtml, /User management is unavailable in demo mode/i);
  assert.match(adminRolesHtml, /Role management is unavailable in demo mode/i);
  assert.doesNotMatch(relationsHtml, />Table<|>Graph</i);
  assert.match(relationsHtml, /Imported rules/i);
  assert.doesNotMatch(
    relationsHtml,
    /Catalogue quality|Original ANU wording is retained here/i,
  );
  const courseHtml = await courseResponse.text();
  assert.match(courseHtml, /Software Design Methodologies/i);
  assert.match(courseHtml, /Requisites and compatibility/i);
  assert.doesNotMatch(courseHtml, /Back to courses/i);
  const chainHtml = await chainResponse.text();
  assert.match(chainHtml, /Prerequisite chain and unlocks/i);
  for (const prerequisite of ["MATH1005", "COMP2100", "COMP1110", "COMP1100"]) {
    assert.match(chainHtml, new RegExp(prerequisite));
  }
  const summaryHtml = await summaryResponse.text();
  assert.match(summaryHtml, /Structured rule/i);
  assert.match(summaryHtml, /Imported requirement matrix/i);
  assert.match(summaryHtml, /Complete all of the following/i);
  assert.match(summaryHtml, /Complete at least.*COMP.*coded courses/is);
  assert.match(summaryHtml, /Complete one of the following/i);
  assert.match(summaryHtml, /Complete at least.*MATH.*coded courses/is);
  assert.match(summaryHtml, /COMP6466/i);
});

test("removes the disposable starter and keeps product metadata", async () => {
  const [
    planPage,
    planClient,
    adminPage,
    coursePage,
    courseDetailClient,
    prereqGraph,
    courseDrawer,
    coursePicker,
    providers,
    publishedCatalogue,
    planCatalogue,
    catalogue,
    globals,
    courseFind,
    appShell,
    sidebar,
    topbar,
    layout,
    adminLayout,
    proxy,
    logoutRoute,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/plan/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/plan/plan-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/courses/[code]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/courses/[code]/course-detail-client.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../components/prereq-graph.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/overlays/course-drawer.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/overlays/course-picker.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/providers.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../lib/coursemap/published-catalogue.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/coursemap/plan-catalogue.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/catalogue.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/course-find.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/shell/app-shell.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/shell/sidebar.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/shell/topbar.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(planPage, /loadCurrentUserPlanCatalogue/);
  assert.match(planClient, /year-board/);
  assert.match(planClient, /STANDARD_COURSE_SLOTS/);
  assert.match(planClient, /This semester is already full/);
  assert.match(planClient, /reorderAttempt/);
  assert.match(planClient, /Move anyway/);
  assert.match(planClient, /CourseDrawer/);
  assert.match(planClient, /onPointerDown/);
  assert.match(planClient, /dragPreview/);
  assert.match(planClient, /previewUsesEmptySlot/);
  assert.match(planClient, /style=\{\{ height: dragPointer\?\.rowHeight \}\}/);
  assert.match(planClient, /animate-drop-slot-in/);
  assert.match(planClient, /translate3d/);
  assert.match(planClient, /role="tooltip"/);
  assert.match(planClient, /group-hover:visible/);
  assert.match(planClient, /programmeRequirementsImported/);
  assert.doesNotMatch(planClient, /Blocked: needs/);
  assert.match(adminPage, /Live catalogue status/);
  assert.match(adminPage, /Publication workflow/);
  assert.match(coursePage, /loadPublishedCourse/);
  assert.match(courseDetailClient, /completedCodes/);
  assert.match(courseDetailClient, /plannedCodes/);
  assert.match(courseDetailClient, /prerequisiteEdges/);
  assert.match(courseDetailClient, /CourseReferenceText/);
  assert.match(courseDetailClient, /Student experience and self-review/);
  assert.doesNotMatch(courseDetailClient, /> Parsed</);
  assert.match(prereqGraph, /completedCodes\.has\(item\)/);
  assert.match(prereqGraph, /bg-emerald-50 text-emerald-700/);
  assert.match(prereqGraph, /isPlanned/);
  assert.match(prereqGraph, /bg-white text-zinc-700 ring-1 ring-zinc-200/);
  assert.match(prereqGraph, /bg-rose-50 text-rose-700/);
  assert.match(prereqGraph, /ring-rose-200/);
  assert.doesNotMatch(prereqGraph, /bg-rose-50\/40/);
  assert.match(prereqGraph, /No prerequisite listed/);
  assert.match(prereqGraph, /No imported unlocks yet/);
  assert.match(prereqGraph, /Not imported yet/);
  assert.match(prereqGraph, /prefetch=\{false\}/);
  assert.match(prereqGraph, /stroke-zinc-300/);
  assert.doesNotMatch(courseDetailClient, /Back to courses/);
  assert.doesNotMatch(courseDrawer, /Move course to|\bmoveAttempt\b/);
  assert.doesNotMatch(courseDrawer, />Undo</);
  assert.match(courseDrawer, />\s*Completed\s*</);
  assert.match(courseDrawer, /updateAttempt\(attempt\.id, "completed"\)/);
  assert.doesNotMatch(courseDrawer, /\? "planned" : "completed"/);
  assert.match(courseDrawer, /grid grid-cols-3 gap-2/);
  assert.match(courseDrawer, /must be completed or planned\s+earlier/);
  assert.match(courseDrawer, />\s*Requisites\s*</);
  assert.match(courseDrawer, /bg-rose-50 text-rose-700 ring-rose-200/);
  assert.match(courseDrawer, /!ring-emerald-300 hover:!bg-emerald-50/);
  assert.match(courseDrawer, /hover:!bg-rose-50 hover:!text-rose-700/);
  assert.match(courseDrawer, /More course information/);
  assert.match(
    courseDrawer,
    /View assessment, learning outcomes and the complete course record/,
  );
  assert.doesNotMatch(courseDrawer, /Course information|Action needed|✓/);
  assert.match(coursePicker, /\/api\/courses\/search/);
  assert.match(coursePicker, /Search 2\+ characters/);
  assert.doesNotMatch(coursePicker, /In plan/);
  assert.match(providers, /normaliseAttempts/);
  assert.match(providers, /const limit = 1/);
  assert.doesNotMatch(providers, /from "@\/lib\/catalogue"/);
  assert.match(layout, /await import\("@\/lib\/catalogue"\)/);
  assert.match(publishedCatalogue, /await import\("@\/lib\/catalogue"\)/);
  assert.doesNotMatch(publishedCatalogue, /from "@\/lib\/catalogue"/);
  assert.match(planCatalogue, /await import\("@\/lib\/catalogue"\)/);
  assert.match(catalogue, /units === 12 \? 2 : 1/);
  assert.match(catalogue, /function prerequisiteChainCodes/);
  assert.match(globals, /scrollbar-gutter: stable/);
  assert.match(globals, /find-background-in/);
  assert.match(globals, /find-content-in/);
  assert.match(globals, /find-closing-field-out/);
  assert.match(courseFind, /import \{ Command \} from "cmdk"/);
  assert.match(courseFind, /shouldFilter=\{false\}/);
  assert.match(courseFind, /\/api\/courses\/search/);
  assert.match(courseFind, /aria-label="Find courses"/);
  assert.match(courseFind, /const defaultOptions/);
  assert.match(courseFind, /backdrop-blur-\[1px\]/);
  assert.doesNotMatch(appShell, /max-w-\[1440px\]/);
  assert.match(appShell, /min-w-0/);
  assert.match(appShell, /w-full/);
  assert.match(appShell, /max-w-none/);
  assert.match(appShell, /!fullBleed && "px-4/);
  assert.match(sidebar, /\/admin\/dashboard/);
  assert.match(sidebar, /\/admin\/users/);
  assert.match(sidebar, /\/admin\/roles/);
  assert.match(sidebar, /!admin &&/);
  assert.match(topbar, /after:inset-x-0/);
  assert.match(providers, /fixed/);
  assert.match(providers, /right-4/);
  assert.match(providers, /top-4/);
  assert.match(layout, /Coursemap/);
  assert.match(layout, /og\.png/);
  assert.match(adminLayout, /if \(!viewer\)[\s\S]*redirect\(/);
  assert.match(adminLayout, /if \(!canAccessAdmin\)[\s\S]*notFound\(\)/);
  assert.doesNotMatch(adminLayout, /admin-access-required/);
  assert.match(proxy, /request:\s*\{ headers: request\.headers \}/);
  assert.match(
    proxy,
    /const downstreamResponse = applyTo\(\s*NextResponse\.next\(\{[\s\S]*?request:\s*\{ headers: request\.headers \}/,
  );
  assert.match(
    proxy,
    /return authenticated\s*\?\s*privateNoStore\(downstreamResponse\)/,
  );
  assert.match(providers, /event\.persisted/);
  assert.match(providers, /window\.location\.reload\(\)/);
  assert.match(providers, /demoInitialAttempts = EMPTY_DEMO_INITIAL_ATTEMPTS/);
  assert.match(logoutRoute, /Clear-Site-Data/);
  assert.match(packageJson, /"name": "anu-coursemap"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
  await access(new URL("../public/og.png", import.meta.url));
  for (const path of [
    "components/admin/relation-graph.tsx",
    "components/calendar/study-calendar.tsx",
    "components/charts/student-experience-trend.tsx",
    "components/dashboard/course-progress-chart.tsx",
    "lib/student-progress.ts",
  ]) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)));
  }
});
