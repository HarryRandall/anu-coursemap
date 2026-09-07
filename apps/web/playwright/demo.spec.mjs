import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { test } from "./request-fixture.mjs";
import { load } from "cheerio";

const origin = "http://127.0.0.1:4217";

async function render(api, path = "/plan") {
  return api(`${origin}${path}`, {
    headers: { accept: "text/html" },
  });
}

async function assertNotFoundPage(response) {
  // Next.js streams loading boundaries before it knows the final page status.
  assert.ok([200, 404].includes(response.status));
  const html = await response.text();
  assert.match(html, /NEXT_HTTP_ERROR_FALLBACK;404|Page not found/i);
  assert.match(html, /noindex/);
}

for (const colorScheme of ["light", "dark"]) {
  test(`course tab indicators switch without a stray line in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/courses/COMP1100");
    const overview = page.getByRole("tab", { name: "Overview", exact: true });
    const offerings = page.getByRole("tab", { name: "Offerings", exact: true });
    await offerings.click();
    const indicator = (element) => {
      const style = getComputedStyle(element, "::after");
      return {
        colour: style.backgroundColor,
        bottom: style.bottom,
        opacity: style.opacity,
        transition: style.transitionDuration,
      };
    };
    const inactive = await overview.evaluate(indicator);
    const active = await offerings.evaluate(indicator);
    assert.equal(inactive.colour, active.colour);
    assert.equal(inactive.bottom, "0px");
    assert.equal(active.bottom, "0px");
    assert.equal(inactive.opacity, "0");
    assert.equal(active.opacity, "1");
    assert.equal(inactive.transition, "0s");
    assert.equal(active.transition, "0s");
  });
}

test("course directory links retain the document while loading the course", async ({
  page,
}) => {
  await page.goto("/courses?q=COMP3900");
  const link = page.getByRole("link", {
    name: "Computing Project",
    exact: true,
  });
  await link.waitFor({ state: "visible" });
  const documentOrigin = await page.evaluate(() => performance.timeOrigin);
  await link.click();
  await page
    .getByRole("heading", { name: "Computing Project", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => performance.timeOrigin),
    documentOrigin,
  );
});

test("keeps the public entry, catalogue and authentication routes accessible", async ({
  request: api,
}) => {
  const [homeResponse, coursesResponse, signInResponse, signUpResponse] =
    await Promise.all([
      render(api, "/"),
      render(api, "/courses?q=COMP3900"),
      render(api, "/login?next=%2F%2Fevil.example%2Fplan"),
      render(api, "/signup"),
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
  assert.match(coursesHtml, /[\d,]+<!-- --> <span[^>]*>courses<\/span>/i);
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

test("server-renders the complete student workspace", async ({
  request: api,
}) => {
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
  const responses = await Promise.all(paths.map((path) => render(api, path)));
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
  assert.match(academicHtml, /Weighted average mark/i);
  assert.doesNotMatch(academicHtml, /Your study record|Edit study details/i);
  assert.match(calendarHtml, /Study calendar/i);
  assert.doesNotMatch(
    calendarHtml,
    /Timetable times and rooms are not imported yet/i,
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
    /Select a published degree in onboarding to see its rules/i,
  );
  assert.doesNotMatch(
    requirementsHtml,
    /Rule group coverage|possible matches|not an official graduation assessment/i,
  );
  assert.match(roadmapHtml, /Visual degree planning/i);
  assert.match(roadmapHtml, /Now/i);
  assert.equal(load(roadmapHtml)("h1.sr-only").text(), "Roadmap");
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

test("redirects legacy student routes to their replacements", async ({
  request: api,
}) => {
  const [historyResponse, timetableResponse] = await Promise.all([
    api(`${origin}/history`, { redirect: "manual" }),
    api(`${origin}/timetable`, { redirect: "manual" }),
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
      new URL("../ui/key-dates/university-calendar-view.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /loadPublishedUniversityCalendar/);
  assert.match(page, /decorateUniversityCalendarEvents/);
  assert.match(calendarView, /groupUniversityCalendarEventsByMonth/);
  assert.match(calendarView, /Calendar year/);
  assert.match(calendarView, /Past dates/);
  assert.doesNotMatch(calendarView, /Next up|Breakdown|MonthAgenda|monthCells/);
  assert.doesNotMatch(calendarView, /const events = \[/);
});

test("fails closed for malformed auth handlers and cross-origin logout", async ({
  request: api,
}) => {
  const [callbackResponse, confirmResponse, logoutResponse] = await Promise.all(
    [
      api(`${origin}/auth/callback?code=&code=duplicate`, {
        redirect: "manual",
      }),
      api(`${origin}/auth/confirm?token_hash=value&type=magiclink`, {
        redirect: "manual",
      }),
      api(`${origin}/auth/logout`, {
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

test("server-renders the routed Coursemap degree planner", async ({
  request: api,
}) => {
  const response = await render(api, "/plan");
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

test("server-renders admin and course-detail routes", async ({
  request: api,
}) => {
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
    render(api, "/admin/dashboard"),
    render(api, "/admin/courses"),
    render(api, "/admin/courses/COMP3600"),
    render(api, "/admin/users"),
    render(api, "/admin/roles"),
    render(api, "/admin/relations"),
    render(api, "/courses/COMP2100"),
    render(api, "/courses/COMP3670?tab=requisites"),
    render(api, "/courses/COMP3600?tab=requisites"),
  ]);
  assert.equal(adminResponse.status, 200);
  assert.equal(adminCoursesResponse.status, 200);
  await assertNotFoundPage(adminCourseReviewResponse);
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
  assert.doesNotMatch(adminHtml, /Search courses|Help &amp; support/i);
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

test("routes course imports through the directory and durable run workspace", async ({
  request: api,
}) => {
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
    api(`${origin}/admin/imports`, { redirect: "manual" }),
    render(api, "/admin/courses"),
    api(`${origin}/admin/imports/programmes`, { redirect: "manual" }),
    api(`${origin}/api/admin/catalogue/imports/directory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ catalogueYear: 2026, target: "programmes" }),
    }),
    api(`${origin}/api/admin/catalogue/imports/programmes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ catalogueYear: 2026, programmeCodes: ["BCOMP"] }),
    }),
    api(`${origin}/api/admin/catalogue/programmes?year=2026&q=BCOMP`),
    api(`${origin}/admin/imports/sync`, { redirect: "manual" }),
    api(`${origin}/admin/imports/sync/demo-run-1`, { redirect: "manual" }),
    api(`${origin}/admin/imports/courses`, { redirect: "manual" }),
    api(`${origin}/admin/imports/changes`, { redirect: "manual" }),
    api(`${origin}/admin/imports/changes/1`, { redirect: "manual" }),
  ]);

  // Imports now live under the object they belong to, so the former shared
  // section path is gone. Retired course import entry points and programme
  // importing remain absent in Phase 1.
  assert.equal(importsResponse.status, 404);
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
  assert.match(directoryHtml, /Refresh the course directory/i);
  assert.match(directoryHtml, /Search courses by code or title/i);
  assert.doesNotMatch(directoryHtml, /Import selected/i);
  assert.match(directoryHtml, /No courses for/i);
  // Deployment state no longer renders as a full-width banner; it surfaces on
  // the import control in the selection bar instead.
  assert.doesNotMatch(directoryHtml, /Detailed imports are disabled/i);
  assert.match(directoryHtml, /href="\/admin\/courses\/imports"/i);
  assert.doesNotMatch(directoryHtml, /Find a course/i);

  // The directory does not restore the wizard chrome from the retired import
  // surfaces.
  assert.doesNotMatch(directoryHtml, /Everything arrives as a draft/i);
  assert.doesNotMatch(directoryHtml, />\s*(?:Overview|Activity|Flags)\s*</i);
  assert.doesNotMatch(directoryHtml, /<h1(?![^>]*sr-only)[^>]*>/i);
});

test("removes the routes the imports split replaced", async ({
  request: api,
}) => {
  const responses = await Promise.all(
    [
      "/admin/imports/new",
      "/admin/imports/activity",
      "/admin/imports/history",
      "/admin/imports/runs",
      "/admin/imports/runs/demo-run-1",
      "/admin/imports/structures/runs",
      "/admin/imports/structures/runs/demo-run-1",
    ].map((path) => api(`${origin}${path}`, { redirect: "manual" })),
  );

  for (const response of responses) {
    assert.equal(response.status, 404);
  }
});

test("serves the indoor map picker and a per-building floor plan editor", async ({
  request: api,
}) => {
  const [pickerResponse, editorResponse, unknownResponse] = await Promise.all([
    render(api, "/admin/rooms"),
    render(api, "/admin/rooms/osm-way-52333714"),
    render(api, "/admin/rooms/not-a-real-building"),
  ]);

  assert.equal(pickerResponse.status, 200);
  assert.equal(editorResponse.status, 200);
  await assertNotFoundPage(unknownResponse);

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
  // One canvas: the section tabs are gone in favour of a single tool rail
  // that also carries snapping and camera controls, a floor pill and a hint
  // over the map, and a collapsible right-hand inspector.
  assert.equal(
    editor('[role="tablist"][aria-label="Indoor map sections"]').length,
    0,
  );
  assert.equal(editor('[aria-label="Floor plan tools"]').length, 1);
  for (const label of ["Select", "Wall", "Door", "Stairs", "Lift"]) {
    assert.ok(
      editor(`[aria-label="Floor plan tools"] button[aria-label="${label}"]`)
        .length >= 1,
      `the ${label} tool is on the rail`,
    );
  }
  assert.equal(editor('section[aria-label="Floor plan canvas"]').length, 1);
  assert.equal(editor('[aria-label="Building floors"]').length, 1);
  assert.equal(editor('aside[aria-label="Inspector"]').length, 1);
  assert.equal(
    editor('[role="tablist"][aria-label="Inspector sections"]').length,
    1,
  );
  for (const label of ["Selection", "Layers", "Issues"]) {
    assert.equal(
      editor(
        `[aria-label="Inspector sections"] [role="tab"]:contains("${label}")`,
      ).length,
      1,
    );
  }
  assert.equal(
    editor(
      '[aria-label="Floor plan tools"] [role="group"][aria-label="Snapping"]',
    ).length,
    1,
  );
  assert.equal(
    editor('[aria-label="Floor plan tools"] [aria-label="View"]').length,
    1,
  );
  assert.equal(editor('button[aria-label="Hide inspector"]').length, 1);
  assert.equal(
    editor('section[aria-label="Floor plan canvas"] [role="status"]').length,
    1,
  );
  assert.equal(editor('[aria-label="Indoor map name"]').length, 0);
  assert.equal(editor('[aria-label="Save indoor map"]').length, 1);
  const editorMainText = editor("main").text();
  assert.match(editorMainText, /Forestry Building/u);

  // Naming and selected-item details are on demand, so the canvas is no
  // longer compressed by permanent settings rails.
  assert.doesNotMatch(editorMainText, /Floor settings/u);
  assert.doesNotMatch(editorMainText, /Revision \d+|Unsaved/u);
});

test("drops the indoor map features that were removed", async ({
  request: api,
}) => {
  const [picker, editor] = await Promise.all([
    render(api, "/admin/rooms").then((response) => response.text()),
    render(api, "/admin/rooms/osm-way-52333714").then((response) =>
      response.text(),
    ),
  ]);

  for (const html of [picker, editor]) {
    assert.doesNotMatch(
      html,
      /Import SVG|Start mapping paths|Use building footprint|Automatic route preview/u,
    );
  }
});

test("returns rooms as results in their own right, not just their building", async ({
  request: api,
}) => {
  const [roomQuery, buildingLink, deepLink] = await Promise.all([
    render(api, "/rooms?q=G01").then((response) => response.text()),
    render(api, "/rooms?place=osm-way-52333714").then((response) =>
      response.text(),
    ),
    render(api, "/rooms?room=demo-room-1-1").then((response) =>
      response.text(),
    ),
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

test("removes component reference pages and navigation", async ({
  request: api,
}) => {
  for (const route of [
    "/design-system",
    "/design-system/typography",
    "/admin/design-system/components",
    "/admin/design-system/foundations",
    "/admin/design-system-preview/tokens/foundations",
    "/api/design-system/review",
  ]) {
    assert.equal((await render(api, route)).status, 404, route);
  }
  const html = await (await render(api, "/admin/courses")).text();
  const links = load(html)("a")
    .map((_, element) => load(html)(element).attr("href"))
    .get();
  assert.ok(links.every((href) => !href.includes("design-system")));
});
