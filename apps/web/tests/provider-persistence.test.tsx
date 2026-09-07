import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { AppProvider, useCoursemap, type AppState } from "@/app/providers";

const actions = vi.hoisted(() => ({
  addPlanCourse: vi.fn(),
  movePlanCourse: vi.fn(),
  removePlanCourse: vi.fn(),
  recordCourseAttempt: vi.fn(),
  saveProfileAndPlan: vi.fn(),
  setCurrentUserPlanExtensionYears: vi.fn(),
}));
vi.mock("@/lib/coursemap/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@coursemap/ui/primitives/sonner", () => ({ Toaster: () => null }));

let context: ReturnType<typeof useCoursemap>;
function Consumer() {
  const value = useCoursemap();
  useEffect(() => {
    context = value;
  }, [value]);
  return (
    <div>{value.state.attempts.map((item) => item.courseCode).join(",")}</div>
  );
}
const initialState: AppState = {
  schemaVersion: 1,
  profile: {
    name: "Test Student",
    studentId: "",
    email: "student@example.test",
    commencementYear: 2026,
    catalogueYear: 2026,
    degreeCode: "",
    majorCode: "",
    minorCodes: [],
    specialisationCodes: [],
    studyLoad: "Full time",
    extensionYears: 0,
  },
  attempts: [
    {
      id: "saved-course",
      academicYear: 2026,
      courseCode: "COMP1100",
      termId: "2026-s1",
      status: "planned",
    },
  ],
};
async function mount() {
  render(
    <AppProvider
      viewer={null}
      canAccessAdmin={false}
      initialState={initialState}
    >
      <Consumer />
    </AppProvider>,
  );
  await waitFor(() => expect(context.ready).toBe(true));
}
beforeEach(() => vi.resetAllMocks());

test("adds a course only after the server saves it", async () => {
  await mount();
  actions.addPlanCourse.mockResolvedValueOnce({
    ok: false,
    message: "The course could not be saved.",
  });
  await act(async () => {
    await context.addCourse("COMP1110", "2026-s2", 2026);
  });
  expect(context.state.attempts).toHaveLength(1);
  actions.addPlanCourse.mockResolvedValueOnce({
    ok: true,
    id: "database-id",
    message: "Saved",
  });
  await act(async () => {
    await context.addCourse("COMP1110", "2026-s2", 2026);
  });
  expect(actions.addPlanCourse).toHaveBeenLastCalledWith(
    "COMP1110",
    "2026-s2",
    2026,
  );
  expect(context.state.attempts[1].id).toBe("database-id");
});

test("restores a course position when the server rejects a move", async () => {
  await mount();
  actions.movePlanCourse.mockResolvedValue({
    ok: false,
    message: "The move could not be saved.",
  });
  await act(async () => {
    await context.reorderAttempt("saved-course", "2026-s2");
  });
  expect(actions.movePlanCourse).toHaveBeenCalledWith(
    "saved-course",
    "2026-s2",
    undefined,
  );
  expect(context.state.attempts[0].termId).toBe("2026-s1");
});

test("keeps the saved profile when its update fails", async () => {
  await mount();
  actions.saveProfileAndPlan.mockResolvedValue({
    ok: false,
    message: "The profile could not be saved.",
  });
  await act(async () => {
    await context.updateProfile({ name: "Unsaved name" });
  });
  expect(context.state.profile.name).toBe("Test Student");
});
