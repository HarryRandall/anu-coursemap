import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { useInputModality } from "@/lib/browser/use-input-modality";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";

function Menu() {
  useInputModality();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Model</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>First model</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

test("pointer selection returns menu focus without changing to keyboard modality", async () => {
  const user = userEvent.setup();
  render(<Menu />);
  await user.click(screen.getByRole("button", { name: "Model" }));
  await user.click(await screen.findByRole("menuitem"));
  expect(screen.getByRole("button", { name: "Model" })).toHaveFocus();
  expect(document.documentElement.dataset.inputModality).toBe("pointer");
  await user.keyboard("{Enter}{Escape}");
  expect(screen.getByRole("button", { name: "Model" })).toHaveFocus();
  expect(document.documentElement.dataset.inputModality).toBe("keyboard");
});

test("touch and pen use pointer styling, shortcuts do not change it, and Tab restores keyboard styling", () => {
  const { unmount } = renderHook(useInputModality);
  for (const pointerType of ["touch", "pen", "mouse"]) {
    fireEvent.pointerDown(document.body, { pointerType });
    expect(document.documentElement.dataset.inputModality).toBe("pointer");
  }
  fireEvent.keyDown(document.body, { key: "c", metaKey: true });
  expect(document.documentElement.dataset.inputModality).toBe("pointer");
  fireEvent.keyDown(document.body, { key: "Tab" });
  expect(document.documentElement.dataset.inputModality).toBe("keyboard");
  unmount();
  fireEvent.pointerDown(document.body);
  expect(document.documentElement).not.toHaveAttribute("data-input-modality");
});
