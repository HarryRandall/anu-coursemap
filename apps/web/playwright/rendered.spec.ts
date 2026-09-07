import assert from "node:assert/strict";
import { test, expect, login } from "./fixtures";

test("public pages render catalogue data and safe authentication forms", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toContainText(
    "See how every course fits",
  );
  await page.goto("/courses?q=COMP1100&year=2026");
  await expect(page.getByRole("main")).toContainText("COMP1100");
  await page.goto("/login?next=%2F%2Fevil.example%2Fplan");
  await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Continue with Google/ }),
  ).toBeVisible();
  await page.goto("/signup");
  await expect(
    page.locator('input[name="passwordConfirmation"]'),
  ).toBeVisible();
});

test("student pages and legacy redirects use the authenticated workspace", async ({
  page,
  planner,
}) => {
  await login(page, planner);
  for (const path of [
    "/academic",
    "/profile",
    "/calendar",
    "/help",
    "/help/build-your-plan",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page).not.toHaveURL(/\/login/);
  }
  for (const [previous, current] of [
    ["/history", "/academic"],
    ["/timetable", "/calendar"],
  ]) {
    await page.goto(previous);
    await expect(page).toHaveURL(new RegExp(`${current}$`));
  }
});

test("key dates expose the calendar controls", async ({ page }) => {
  await page.goto("/key-dates");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByLabel("Calendar year")).toBeVisible();
});

test("administrator pages use live users, roles and import directories", async ({
  page,
  administrator,
}) => {
  await login(page, administrator);
  for (const path of [
    "/admin/dashboard",
    "/admin/users",
    "/admin/roles",
    "/admin/courses",
    "/admin/courses/imports",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Application error");
  }
  await page.goto("/admin/users");
  await expect(page.getByRole("main")).toContainText(administrator.email);
});

test("retired import and component-reference routes stay absent", async ({
  page,
  administrator,
}) => {
  await login(page, administrator);
  for (const path of [
    "/admin/relations",
    "/admin/imports/new",
    "/admin/imports/activity",
    "/admin/imports/history",
    "/admin/imports/runs",
    "/admin/imports/structures/runs",
    "/design-system",
    "/design-system/typography",
    "/admin/design-system/components",
    "/admin/design-system/foundations",
    "/admin/design-system-preview/tokens/foundations",
    "/api/design-system/review",
  ]) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

test("indoor search, room links and the editor use a published database map", async ({
  page,
  administrator,
  indoorMap,
}) => {
  await login(page, administrator);
  await page.goto("/rooms?q=G01");
  await expect(page.getByLabel("Search results")).toContainText("G01");
  await page.goto(`/rooms?room=${indoorMap.roomId}`);
  await expect(page.getByLabel("Building floors")).toBeVisible();
  await expect(
    page.locator('[aria-labelledby="indoor-directions-heading"]'),
  ).toContainText("Take the lift");
  await page.goto(`/admin/rooms/${indoorMap.buildingSlug}`);
  await expect(page.getByLabel("Floor plan canvas")).toBeVisible();
  for (const tool of ["Select", "Wall", "Door", "Stairs", "Lift"]) {
    await expect(
      page
        .getByLabel("Floor plan tools")
        .getByRole("button", { name: tool, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByLabel("Save indoor map", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Import SVG" })).toHaveCount(0);
});

test("application pages share the wide content limit", async ({
  page,
  administrator,
}) => {
  await login(page, administrator);
  await page.setViewportSize({ width: 2048, height: 1000 });
  for (const route of [
    "/dashboard",
    "/courses",
    "/calendar",
    "/admin/courses",
  ]) {
    await page.goto(route);
    const content = page.locator('[data-slot="page-content"]');
    await content.waitFor({ state: "visible" });
    assert.equal(
      await content.evaluate(
        (element) => element.getBoundingClientRect().width,
      ),
      1536,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page
      .locator('[data-slot="page-content"]')
      .evaluate((element) => element.getBoundingClientRect().width <= 390),
  );
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`course tab indicators switch without a stray line in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/courses/COMP1100/2026");
    const overview = page.getByRole("tab", { name: "Overview", exact: true });
    const offerings = page.getByRole("tab", { name: "Offerings", exact: true });
    await offerings.click();
    const indicator = (element: HTMLElement | SVGElement) => {
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
  await page.goto("/courses?q=COMP1100");
  const link = page.getByRole("link", {
    name: "Programming as Problem Solving",
    exact: true,
  });
  await link.waitFor({ state: "visible" });
  const documentOrigin = await page.evaluate(() => performance.timeOrigin);
  await link.click();
  await page
    .getByRole("heading", {
      name: "Programming as Problem Solving",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.evaluate(() => performance.timeOrigin),
    documentOrigin,
  );
});
