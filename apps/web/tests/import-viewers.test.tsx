import { afterEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportArtefactViewer } from "@/ui/admin/imports/import-artefact-viewer";
import { ImportDatabaseRows } from "@/ui/admin/imports/import-database-rows";
const artifact = {
  id: "artefact-1",
  kind: "validated_json",
  attemptNumber: 1,
  mediaType: "application/json",
};
afterEach(() => vi.unstubAllGlobals());
test("loads JSON artefacts through the supplied endpoint", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response('{"course":"COMP3900"}'));
  vi.stubGlobal("fetch", fetcher);
  render(
    <ImportArtefactViewer
      artifacts={[artifact]}
      endpoint="/api/admin/course-imports/artifacts"
    />,
  );
  expect(await screen.findByText(/COMP3900/)).toBeVisible();
  expect(fetcher).toHaveBeenCalledWith(
    "/api/admin/course-imports/artifacts/artefact-1",
    expect.objectContaining({ cache: "no-store" }),
  );
  expect(screen.getByRole("tab", { name: "Validated JSON" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
test("reports failed artefact requests and retries", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response('{"error":"Please retry"}', { status: 500 }),
    )
    .mockResolvedValueOnce(new Response('{"course":"COMP2100"}'));
  vi.stubGlobal("fetch", fetcher);
  render(
    <ImportArtefactViewer
      artifacts={[artifact]}
      endpoint="/api/admin/academic-structure-imports/artifacts"
    />,
  );
  expect(await screen.findByText("Please retry")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(await screen.findByText(/COMP2100/)).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
test("separates saved tables from planned projection JSON", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"code":"COMP3900"}')),
  );
  render(
    <ImportDatabaseRows
      tables={[{ name: "courses", rows: [{ code: "COMP2100" }] }]}
      artifacts={[{ ...artifact, kind: "database_projection" }]}
      endpoint="/api/admin/course-imports/artifacts"
      project={(value) => [{ name: "courses", rows: [value] }]}
    />,
  );
  expect(screen.getByRole("cell", { name: "COMP2100" })).toBeVisible();
  await user.click(screen.getByRole("tab", { name: "Planned" }));
  expect(await screen.findByRole("cell", { name: "COMP3900" })).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Original projection JSON" }),
  );
  expect(screen.getByRole("button", { name: "View tables" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("keeps database projections out of artefact navigation", () => {
  render(
    <ImportArtefactViewer
      artifacts={[{ ...artifact, kind: "database_projection" }]}
      endpoint="/api/admin/course-imports/artifacts"
    />,
  );
  expect(screen.getByText("No artefacts saved yet.")).toBeVisible();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/imports",
  useSearchParams: () => new URLSearchParams(),
}));

import { CourseReviewTabs } from "@/ui/admin/imports/course-review-tabs";
import { Tabs } from "@coursemap/ui/primitives/tabs";
test("course review exposes pipeline only for imports and locks tabs during edits", async () => {
  const { rerender } = render(
    <Tabs defaultValue="course">
      <CourseReviewTabs hasImport={false} />
    </Tabs>,
  );
  expect(
    screen.queryByRole("tab", { name: "Pipeline" }),
  ).not.toBeInTheDocument();
  for (const name of ["Course data", "Requisites", "Course preview", "Source"])
    expect(screen.getByRole("tab", { name })).toBeVisible();
  rerender(
    <Tabs defaultValue="course">
      <CourseReviewTabs hasImport editing activeTab="course" />
    </Tabs>,
  );
  expect(screen.getByRole("tab", { name: "Pipeline" })).toBeDisabled();
  expect(screen.getByRole("tab", { name: "Course data" })).toBeEnabled();
});
