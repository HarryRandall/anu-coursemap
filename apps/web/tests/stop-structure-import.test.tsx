import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { StopStructureImport } from "../ui/admin/imports/stop-structure-import";
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
test("stops the selected run and refreshes its status", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);
  render(<StopStructureImport runId="selected-run" />);
  fireEvent.click(screen.getByRole("button", { name: "Stop run" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(fetch).toHaveBeenCalledWith(
    "/api/admin/academic-structure-imports",
    expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ runId: "selected-run" }),
    }),
  );
});
test("keeps recovery available when stopping fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  render(<StopStructureImport runId="selected-run" />);
  fireEvent.click(screen.getByRole("button", { name: "Stop run" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "could not be stopped",
  );
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Stop run" })).toBeEnabled();
});
