import { expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YearPicker } from "@/ui/common/year-picker";
import { DirectorySelectionBar } from "@/ui/admin/directory-selection-bar";
import { TooltipProvider } from "@coursemap/ui/primitives/tooltip";
import { setImportModel } from "@/lib/admin/settings-actions";
vi.mock("@/lib/admin/settings-actions", () => ({ setImportModel: vi.fn() }));
test("year picker sorts unique years and keeps All last", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <YearPicker
      years={[2027, 2026, 2027]}
      value={2026}
      onChange={onChange}
      allowAll
    />,
  );
  await user.click(screen.getByRole("button", { name: "Academic year" }));
  const options = screen
    .getAllByRole("button")
    .filter(
      (button) =>
        ["2026", "2027", "All"].includes(button.textContent?.trim() ?? "") &&
        !button.hasAttribute("data-slot"),
    );
  expect(options.map((button) => button.textContent?.trim())).toEqual([
    "2026",
    "2027",
    "All",
  ]);
  await user.click(screen.getByRole("button", { name: "All" }));
  expect(onChange).toHaveBeenCalledWith("all");
});
test("imports wait for the selected model to be saved", async () => {
  const user = userEvent.setup();
  const onImport = vi.fn();
  let finish!: (value: Awaited<ReturnType<typeof setImportModel>>) => void;
  vi.mocked(setImportModel).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(
    <TooltipProvider>
      <DirectorySelectionBar
        canManageModel
        disabledReason={null}
        importModel="test/old"
        modelOptions={["test/old", "test/new"]}
        onClear={vi.fn()}
        onImport={onImport}
        selected={1}
        submitting={false}
      />
    </TooltipProvider>,
  );
  await user.click(
    screen.getByRole("button", { name: "Import model: test/old" }),
  );
  await user.click(screen.getByRole("button", { name: /test\/new/ }));
  expect(screen.getByRole("button", { name: /^Import$/ })).toBeDisabled();
  expect(onImport).not.toHaveBeenCalled();
  await act(async () =>
    finish({ ok: true, model: "test/new", message: "Saved" }),
  );
  await user.click(screen.getByRole("button", { name: /^Import$/ }));
  expect(onImport).toHaveBeenCalledWith("test/new");
});
