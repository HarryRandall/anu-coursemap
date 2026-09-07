import { beforeEach, expect, test, vi } from "vitest";
import AdminCourseYearlessPage from "@/app/admin/courses/[id]/page";

const { loadRecord } = vi.hoisted(() => ({ loadRecord: vi.fn() }));
vi.mock("@/lib/coursemap/admin-course-year", () => ({
  loadAdminCourseYear: loadRecord,
}));
vi.mock("@/lib/auth/viewer", () => ({
  canManageCourseImports: async () => true,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`Redirect: ${path}`);
  },
  notFound: () => {
    throw new Error("Not found");
  },
}));

beforeEach(() => loadRecord.mockReset());

test("legacy links retain their selected historical snapshot", async () => {
  loadRecord.mockResolvedValue({
    publicId: "course-id",
    year: 2025,
    currentSnapshotId: 12,
    activeSnapshotId: 20,
  });
  await expect(
    AdminCourseYearlessPage({
      params: Promise.resolve({ id: "COMP1100" }),
      searchParams: Promise.resolve({ year: ["2025"], snapshot: ["12"] }),
    }),
  ).rejects.toThrow("Redirect: /admin/courses/course-id/2025?snapshot=12");
  expect(loadRecord).toHaveBeenCalledWith("COMP1100", 2025, true, 12);
});

test("unavailable snapshots redirect to the resolved active record", async () => {
  loadRecord.mockResolvedValue({
    publicId: "course-id",
    year: 2026,
    currentSnapshotId: 20,
    activeSnapshotId: 20,
  });
  await expect(
    AdminCourseYearlessPage({
      params: Promise.resolve({ id: "course-id" }),
      searchParams: Promise.resolve({ snapshot: "999" }),
    }),
  ).rejects.toThrow("Redirect: /admin/courses/course-id/2026");
  expect(loadRecord).toHaveBeenCalledWith("course-id", undefined, true, 999);
});

test("missing courses remain not found", async () => {
  loadRecord.mockResolvedValue(null);
  await expect(
    AdminCourseYearlessPage({
      params: Promise.resolve({ id: "COMP1100" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("Not found");
});
