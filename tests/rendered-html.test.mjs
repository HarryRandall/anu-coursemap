import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { load } from "cheerio";

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
          COURSEMAP_QUEUE_IMPORTS_ENABLED: "false",
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
  assert.match(coursesHtml, /Viewing .* of .* course/i);
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
    "/rooms?q=ANU",
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
    roomsSearchHtml,
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
  const roomsPage = load(roomsHtml);
  const roomsSearchPage = load(roomsSearchHtml);
  const searchResults = roomsSearchPage('[aria-label="Search results"]');

  assert.equal(
    roomsPage('input[placeholder="Search ANU buildings, rooms or services..."]')
      .length,
    1,
  );
  assert.match(roomsPage("button").text(), /Layers/i);
  assert.match(roomsPage("button").text(), /Directions/i);
  assert.equal(roomsPage('[aria-label="Search results"]').length, 0);
  assert.equal(searchResults.length, 1);
  // Group headings are list items too, so count the rows a reader can pick.
  assert.equal(searchResults.find("li button").length, 8);
  assert.match(searchResults.text(), /Buildings/);
  assert.match(searchResults.text(), /Showing the first 8 matches/i);
  assert.equal(
    roomsPage(
      '[aria-label="Interactive vector map of ANU and central Canberra"]',
    ).length,
    1,
  );
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
  assert.doesNotMatch(
    html,
    /Degree progress|Degree timeline|Programme requirements and your completion target|Restore programme duration|Add year/i,
  );
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
    render("/courses/COMP3670?tab=requisites"),
    render("/courses/COMP3600?tab=requisites"),
  ]);
  assert.equal(adminResponse.status, 200);
  assert.equal(adminCoursesResponse.status, 200);
  assert.equal(adminCourseReviewResponse.status, 404);
  assert.equal(adminUsersResponse.status, 200);
  assert.equal(adminRolesResponse.status, 200);
  assert.equal(relationsResponse.status, 404);
  assert.equal(courseResponse.status, 200);
  assert.equal(chainResponse.status, 200);
  assert.equal(summaryResponse.status, 200);
  const adminHtml = await adminResponse.text();
  const adminCoursesHtml = await adminCoursesResponse.text();
  const adminUsersHtml = await adminUsersResponse.text();
  const adminRolesHtml = await adminRolesResponse.text();
  assert.match(adminHtml, /Live catalogue status/i);
  assert.match(adminHtml, />Users</);
  assert.doesNotMatch(
    adminHtml,
    /Review courses|Review programmes|Publish reviewed records|source review/i,
  );
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
  assert.match(adminUsersHtml, /User management is unavailable in demo mode/i);
  assert.match(adminRolesHtml, /Role management is unavailable in demo mode/i);
  const courseHtml = await courseResponse.text();
  assert.match(courseHtml, /Software Design Methodologies/i);
  assert.match(courseHtml, /About this course/i);
  assert.match(courseHtml, /Course essentials/i);
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

test("routes course imports through the directory and durable run workspace", async () => {
  const [
    importsResponse,
    directoryResponse,
    programmesResponse,
    programmeDirectoryApiResponse,
    programmeImportApiResponse,
    programmeSearchApiResponse,
    syncResponse,
    syncDetailResponse,
    coursesResponse,
    changesResponse,
    changeDetailResponse,
  ] = await Promise.all([
    fetch(`${origin}/admin/imports`, { redirect: "manual" }),
    render("/admin/courses"),
    fetch(`${origin}/admin/imports/programmes`, { redirect: "manual" }),
    fetch(`${origin}/api/admin/catalogue/imports/directory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ catalogueYear: 2026, target: "programmes" }),
    }),
    fetch(`${origin}/api/admin/catalogue/imports/programmes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ catalogueYear: 2026, programmeCodes: ["BCOMP"] }),
    }),
    fetch(`${origin}/api/admin/catalogue/programmes?year=2026&q=BCOMP`),
    fetch(`${origin}/admin/imports/sync`, { redirect: "manual" }),
    fetch(`${origin}/admin/imports/sync/demo-run-1`, { redirect: "manual" }),
    fetch(`${origin}/admin/imports/courses`, { redirect: "manual" }),
    fetch(`${origin}/admin/imports/changes`, { redirect: "manual" }),
    fetch(`${origin}/admin/imports/changes/1`, { redirect: "manual" }),
  ]);

  // The bare section path opens the durable course run history. Retired course
  // import entry points and programme importing remain absent in Phase 1.
  assert.ok([307, 308].includes(importsResponse.status));
  assert.equal(importsResponse.headers.get("location"), "/admin/imports/runs");
  assert.equal(directoryResponse.status, 200);
  assert.equal(programmesResponse.status, 404);
  assert.equal(programmeDirectoryApiResponse.status, 404);
  assert.equal(programmeImportApiResponse.status, 404);
  assert.equal(programmeSearchApiResponse.status, 404);
  for (const response of [
    syncResponse,
    syncDetailResponse,
    coursesResponse,
    changesResponse,
    changeDetailResponse,
  ]) {
    assert.equal(response.status, 404);
  }

  const directoryHtml = await directoryResponse.text();
  assert.match(directoryHtml, /Refresh directory/i);
  assert.match(directoryHtml, /Search all courses by code or title/i);
  assert.match(directoryHtml, /Import selected/i);
  assert.match(directoryHtml, /No directory courses/i);
  assert.match(directoryHtml, /Detailed imports are disabled/i);
  assert.match(directoryHtml, /Import runs/i);
  assert.doesNotMatch(directoryHtml, /Find a course/i);

  // The directory does not restore the wizard chrome from the retired import
  // surfaces.
  assert.doesNotMatch(directoryHtml, /Everything arrives as a draft/i);
  assert.doesNotMatch(directoryHtml, />\s*(?:Overview|Activity|Flags)\s*</i);
  assert.doesNotMatch(directoryHtml, /<h1(?![^>]*sr-only)[^>]*>/i);
});

test("removes the routes the imports split replaced", async () => {
  const responses = await Promise.all(
    [
      "/admin/imports/new",
      "/admin/imports/activity",
      "/admin/imports/history",
      "/admin/imports/runs/demo-run-1",
    ].map((path) => fetch(`${origin}${path}`, { redirect: "manual" })),
  );

  for (const response of responses) {
    assert.equal(response.status, 404);
  }
});

test("keeps the course review workspace focused on import evidence", async () => {
  const [review, tabs, pipeline, loader, targetReview, adminPreview] =
    await Promise.all([
      readFile(
        new URL("../app/admin/courses/[id]/course-review.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../components/admin/imports/course-review-tabs.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../components/admin/imports/course-import-pipeline.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../lib/coursemap/admin-course-year.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../components/admin/imports/course-import-target-review.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../lib/coursemap/admin-course-preview.ts", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(review, /record\.importTarget \? "pipeline" : "course"/);
  assert.match(review, /<CourseImportPipeline/);
  assert.match(review, /value="requisites"/);
  assert.match(review, /COURSE_REVIEW_CONFIRMATION_NOTE/);
  assert.doesNotMatch(review, /Confirmation note|setConfirmationNote/);
  assert.match(tabs, /value: "pipeline", label: "Pipeline"/);
  assert.match(tabs, /value: "course", label: "Course data"/);
  assert.doesNotMatch(tabs, /value: "changes"|value: "parsed"/);
  assert.match(pipeline, /Full import review/);
  assert.match(pipeline, /Import pipeline stages/);
  assert.match(loader, /from\("course_import_stages"\)/);
  assert.match(loader, /from\("course_extractions"\)/);
  assert.match(loader, /\.in\("candidate_snapshot_id", ancestrySnapshotIds\)/);
  assert.match(targetReview, /<CourseImportPipeline/);
  assert.match(adminPreview, /prerequisiteCodesFromSnapshotProjection/);
});

test("removes the disposable starter and keeps product metadata", async () => {
  const [
    planPage,
    planClient,
    adminPage,
    coursePage,
    courseDetailClient,
    courseDetailView,
    prereqGraph,
    courseDrawer,
    coursePicker,
    providers,
    publishedCourses,
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
      new URL("../components/courses/course-detail-view.tsx", import.meta.url),
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
      new URL("../lib/coursemap/published-courses.ts", import.meta.url),
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
  assert.doesNotMatch(planClient, /programmeRequirementsImported/);
  assert.doesNotMatch(planClient, /Blocked: needs/);
  assert.match(adminPage, /Live catalogue status/);
  assert.match(adminPage, /loadAdminUserSummary/);
  assert.doesNotMatch(adminPage, /Publish reviewed records/);
  assert.match(coursePage, /loadPublishedCourse/);
  assert.match(coursePage, /requestedYearParam/);
  assert.match(coursePage, /loadPublishedCourse\(code, academicYear\)/);
  assert.match(courseDetailClient, /completedCodes/);
  assert.match(courseDetailClient, /plannedCodes/);
  assert.match(courseDetailView, /prerequisiteEdges/);
  assert.match(courseDetailView, /hasPrerequisiteWording/);
  assert.match(courseDetailView, /CourseReferenceText/);
  assert.match(courseDetailView, /Student experience and self-review/);
  assert.match(courseDetailView, /Learning outcomes/);
  assert.match(courseDetailView, /Assessment/);
  assert.match(courseDetailView, /Fees/);
  assert.match(courseDetailView, /Prescribed texts/);
  assert.match(courseDetailView, /Areas of interest/);
  assert.match(courseDetailView, /Course attributes/);
  assert.match(courseDetailView, /\?year=\$\{academicYear\}/);
  assert.doesNotMatch(courseDetailView, /> Parsed</);
  assert.match(prereqGraph, /completedCodes\.has\(item\)/);
  assert.match(prereqGraph, /bg-emerald-50 text-emerald-700/);
  assert.match(prereqGraph, /isPlanned/);
  assert.match(prereqGraph, /bg-white text-zinc-700 ring-1 ring-zinc-200/);
  assert.match(prereqGraph, /bg-rose-50 text-rose-700/);
  assert.match(prereqGraph, /ring-rose-200/);
  assert.doesNotMatch(prereqGraph, /bg-rose-50\/40/);
  assert.match(prereqGraph, /No prerequisite listed/);
  assert.match(prereqGraph, /No mapped course references yet/);
  assert.match(prereqGraph, /No imported unlocks yet/);
  assert.match(prereqGraph, /Not imported yet/);
  assert.match(prereqGraph, /prefetch=\{false\}/);
  assert.match(prereqGraph, /stroke-zinc-300/);
  assert.doesNotMatch(courseDetailClient, /Back to courses/);
  assert.doesNotMatch(courseDrawer, /Move course to|\bmoveAttempt\b/);
  assert.doesNotMatch(courseDrawer, />Undo</);
  assert.match(courseDrawer, />\s*Completed\s*</);
  assert.match(courseDrawer, /updateAttempt\(\s*attempt\.id,\s*"completed"/);
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
  assert.match(coursePicker, /<Dialog/);
  assert.match(
    coursePicker,
    /<Command[\s\S]*?shouldFilter=\{false\}[\s\S]*?loop/,
  );
  assert.match(coursePicker, /Search the catalogue, select a result/);
  assert.match(coursePicker, /View course/);
  assert.match(coursePicker, /Prerequisites/);
  assert.match(coursePicker, /CourseResultSkeleton/);
  assert.match(coursePicker, /SearchFailure/);
  assert.match(coursePicker, /if \(!term\) return null/);
  assert.match(coursePicker, /onCloseAutoFocus/);
  assert.match(coursePicker, /const queryChanged = nextQuery !== trimmedQuery/);
  assert.match(coursePicker, /const loadNextPage =/);
  assert.match(coursePicker, /backButtonRef/);
  assert.match(coursePicker, /className="!contents"/);
  assert.match(
    coursePicker,
    /onKeyDown=\{\(event\) => event\.stopPropagation\(\)\}/,
  );
  assert.match(
    coursePicker,
    /setUnscheduledAcademicYear\(year\)[\s\S]*?setResponse\(null\)/,
  );
  assert.doesNotMatch(coursePicker, /onDoubleClick/);
  assert.match(planClient, /term=\{pickerTerm\}/);
  assert.doesNotMatch(coursePicker, /catalogue\.terms\[0\]/);
  assert.match(coursePicker, /In plan/);
  assert.match(providers, /normaliseAttempts/);
  assert.match(providers, /const limit = 1/);
  assert.doesNotMatch(providers, /from "@\/lib\/catalogue"/);
  assert.match(layout, /await import\("@\/lib\/catalogue"\)/);
  assert.match(publishedCourses, /await import\("@\/lib\/catalogue"\)/);
  assert.doesNotMatch(publishedCourses, /from "@\/lib\/catalogue"/);
  assert.match(publishedCourses, /published_course_detail/);
  assert.match(publishedCourses, /resolvePrerequisiteFallbackDetails/);
  assert.match(publishedCourses, /p_academic_year: academicYear/);
  assert.match(publishedCourses, /published-course:\$\{academicYear\}/);
  assert.doesNotMatch(publishedCourses, /course_versions/);
  assert.match(planCatalogue, /await import\("@\/lib\/catalogue"\)/);
  assert.match(planCatalogue, /course_snapshot_id/);
  assert.match(planCatalogue, /academic_year_id/);
  assert.doesNotMatch(planCatalogue, /course_versions/);
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
  assert.match(providers, /toast\.warning/);
  assert.match(providers, /toast\.info/);
  assert.match(providers, /toast\.success/);
  assert.match(providers, /<Toaster \/>/);
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

test("serves the indoor map picker and a per-building floor plan editor", async () => {
  const [pickerResponse, editorResponse, unknownResponse] = await Promise.all([
    render("/admin/rooms"),
    render("/admin/rooms/osm-way-52333714"),
    render("/admin/rooms/not-a-real-building"),
  ]);

  assert.equal(pickerResponse.status, 200);
  assert.equal(editorResponse.status, 200);
  assert.equal(
    unknownResponse.status,
    404,
    "an unknown building slug is not a floor plan",
  );

  const picker = load(await pickerResponse.text());
  assert.equal(
    picker('[aria-label="Search ANU buildings"]').length,
    1,
    "the picker leads with a search",
  );
  assert.equal(
    picker('nav[aria-label="Published ANU buildings"]').length,
    0,
    "the permanent list of every building is gone",
  );
  assert.equal(
    picker('[aria-label="Interactive vector map of ANU and central Canberra"]')
      .length,
    1,
  );

  const editor = load(await editorResponse.text());
  assert.equal(
    editor('[role="tablist"][aria-label="Indoor map sections"]').length,
    1,
  );
  for (const label of [
    "Floors",
    "Floor plan",
    "Entrances & routes",
    "Preview",
  ]) {
    assert.equal(editor(`[role="tab"]:contains("${label}")`).length, 1);
  }
  assert.equal(editor('[aria-label="Building floors"]').length, 1);
  assert.equal(editor('[aria-label="Indoor map name"]').length, 0);
  assert.equal(editor('[aria-label="Save indoor map"]').length, 1);
  const editorMainText = editor("main").text();
  assert.match(editorMainText, /Forestry Building/u);

  // Naming and selected-item details are on demand, so the canvas is no
  // longer compressed by permanent settings or properties rails.
  assert.doesNotMatch(editorMainText, /Floor settings|Properties/u);
  assert.doesNotMatch(editorMainText, /Revision \d+|Unsaved/u);
});

test("drops the indoor map features that were removed", async () => {
  const [picker, editor] = await Promise.all([
    render("/admin/rooms").then((response) => response.text()),
    render("/admin/rooms/osm-way-52333714").then((response) => response.text()),
  ]);

  for (const html of [picker, editor]) {
    assert.doesNotMatch(
      html,
      /Import SVG|Start mapping paths|Use building footprint|Automatic route preview/u,
    );
  }
});

test("returns rooms as results in their own right, not just their building", async () => {
  const [roomQuery, buildingLink, deepLink] = await Promise.all([
    render("/rooms?q=G01").then((response) => response.text()),
    render("/rooms?place=osm-way-52333714").then((response) => response.text()),
    render("/rooms?room=demo-room-1-1").then((response) => response.text()),
  ]);

  const results = load(roomQuery)('[aria-label="Search results"]');
  assert.equal(results.length, 1);
  assert.match(results.text(), /Rooms/);
  assert.match(results.text(), /G01/);
  assert.match(results.text(), /Forestry Building/);

  // Selecting a mapped building exposes every floor and its findable rooms in
  // the controls, without making someone search for a room they can already
  // see on the building.
  const buildingRooms = load(buildingLink)(
    '[aria-labelledby="building-rooms-heading"]',
  );
  assert.equal(buildingRooms.length, 1);
  assert.match(buildingRooms.text(), /Rooms in Forestry Building/);
  assert.match(buildingRooms.text(), /G · Ground floor/);
  assert.match(buildingRooms.text(), /1 · Level 1/);
  assert.equal(buildingRooms.find("button").length, 14);

  // A room link resolves its own building and opens it, with no building
  // parameter needed in the URL.
  const linked = load(deepLink);
  assert.match(linked("body").text(), /1\.01/);
  assert.equal(linked('[aria-label="Building floors"]').length, 1);
  // The same deep link exposes concise indoor steps in the left-hand controls.
  const indoorDirections = linked(
    '[aria-labelledby="indoor-directions-heading"]',
  );
  assert.equal(indoorDirections.length, 1);
  assert.match(indoorDirections.text(), /Enter Forestry Building/);
  assert.match(indoorDirections.text(), /Take the lift/);
  assert.match(indoorDirections.text(), /Continue to 1\.01/);
});
