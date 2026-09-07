import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@coursemap/ui/primitives/tooltip";
import { ConfirmDialog } from "@/ui/common/confirm-dialog";

test("confirmation titles expose their full text and closing does not confirm", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const title =
    "Archive a course with a long title that cannot fit in the dialog header?";
  render(
    <TooltipProvider delayDuration={0}>
      <ConfirmDialog
        open
        destructive
        title={title}
        description="The saved versions will remain available."
        confirmLabel="Archive"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    </TooltipProvider>,
  );
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  await user.hover(screen.getByRole("heading", { name: title }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent(title);
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onConfirm).not.toHaveBeenCalled();
});
