import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Tabs } from "@coursemap/ui/primitives/tabs";
import { ImportTargetReviewLoading } from "@/ui/admin/imports/import-target-review-loading";
import { ImportSectionTabs } from "@/ui/admin/imports/import-section-tabs";
import { Breadcrumbs } from "@/ui/shell/breadcrumbs";

vi.mock("next/navigation", () => ({
  usePathname: () =>
    "/admin/courses/imports/a23de36a-bd72-4d9d-89ec-3b548799815d",
}));

vi.mock("@/ui/shell", () => ({
  AppShell: ({
    children,
    tabs,
    breadcrumbSegmentLabels,
  }: {
    children: ReactNode;
    tabs?: ReactNode;
    breadcrumbSegmentLabels?: Record<string, string | null>;
  }) => (
    <>
      <Breadcrumbs segmentLabels={breadcrumbSegmentLabels} />
      {tabs}
      {children}
    </>
  ),
}));

test("keeps the collapsed ancestors in place while the import name loads", () => {
  const { rerender } = render(<ImportTargetReviewLoading noun="course" />);
  const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(trail).getAllByRole("listitem")).toHaveLength(3);
  expect(within(trail).getByRole("link", { name: "Admin" })).toBeVisible();
  expect(
    within(trail).getByRole("button", { name: "Show hidden breadcrumbs" }),
  ).toBeVisible();
  expect(
    within(trail).queryByRole("link", { name: "Imports" }),
  ).not.toBeInTheDocument();
  expect(trail).not.toHaveTextContent("a23de36a");
  rerender(<Breadcrumbs currentLabel="INFS1001" />);
  const loaded = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(loaded).getAllByRole("listitem")).toHaveLength(3);
  expect(
    within(loaded).getByRole("button", { name: "Show hidden breadcrumbs" }),
  ).toBeVisible();
  expect(
    within(loaded).getByRole("link", { name: "INFS1001" }),
  ).toHaveAttribute("aria-current", "page");
});

test.each(["course", "programme"])(
  "matches the %s import tabs and pipeline table while loading",
  (noun) => {
    const { rerender } = render(<ImportTargetReviewLoading noun={noun} />);
    const labels = [
      "Pipeline",
      "Source and artefacts",
      "Database rows",
      noun === "course" ? "Course preview" : "Preview",
    ];
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(
      labels,
    );
    screen.getAllByRole("tab").forEach((tab) => expect(tab).toBeDisabled());
    const table = screen.getByRole("table", {
      name: "Loading import pipeline stages",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Step", "Stage", "Status", "Attempts", "Duration", "Error"]);
    expect(within(table).getAllByRole("row")).toHaveLength(11);
    rerender(
      <Tabs defaultValue="pipeline">
        <ImportSectionTabs course={noun === "course"} />
      </Tabs>,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(
      labels,
    );
    screen.getAllByRole("tab").forEach((tab) => expect(tab).toBeEnabled());
  },
);
