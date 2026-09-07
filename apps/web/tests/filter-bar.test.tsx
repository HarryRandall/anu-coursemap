import { simulateOverlayAnimation } from "./helpers/overlay-animation";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@coursemap/ui/primitives/tooltip";
import { FilterBar } from "@/ui/common/filter-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/academic",
  useSearchParams: () => new URLSearchParams(),
}));

function FilterExample() {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  return (
    <TooltipProvider>
      <FilterBar
        searchPlaceholder="Search courses..."
        filters={[
          {
            key: "status",
            label: "Status",
            options: [{ value: "planned", label: "Planned" }],
          },
        ]}
        state={{
          query,
          values: { status },
          onQueryChange: setQuery,
          onFilterChange: (_, value) => setStatus(value),
        }}
      />
    </TooltipProvider>
  );
}

test("filter selection keeps the outline and returns focus without opening a tooltip", async () => {
  const user = userEvent.setup();
  render(<FilterExample />);
  await user.click(screen.getByRole("button", { name: "Filter" }));
  await user.click(screen.getByRole("button", { name: "Status" }));
  await user.click(screen.getByRole("button", { name: "Planned" }));
  const trigger = screen.getByRole("button", { name: "Filter (1 active)" });
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(trigger).toHaveAttribute("data-variant", "outline");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  await user.hover(trigger);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "1 filter applied",
  );
  await user.unhover(trigger);
  await waitFor(() =>
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
  );
  await user.click(
    screen.getByRole("button", { name: "Remove the Status filter" }),
  );
  expect(screen.getByRole("button", { name: "Filter" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

for (const dismissal of ["Escape", "selection"]) {
  test(`filter values stay mounted during ${dismissal} and reset on reopening`, async () => {
    const animation = simulateOverlayAnimation();
    try {
      render(<FilterExample />);
      fireEvent.click(screen.getByRole("button", { name: "Filter" }));
      fireEvent.click(screen.getByRole("button", { name: "Status" }));
      const planned = screen.getByRole("button", { name: "Planned" });
      const dialog = screen.getByRole("dialog");
      if (dismissal === "Escape") {
        fireEvent.keyDown(dialog, { key: "Escape" });
      } else {
        fireEvent.click(planned);
      }
      expect(dialog).toHaveAttribute("data-state", "closed");
      expect(planned).toBeInTheDocument();
      const exit = new Event("animationend", { bubbles: true });
      Object.defineProperty(exit, "animationName", { value: "overlay-exit" });
      fireEvent(dialog, exit);
      const trigger = screen.getByRole("button", {
        name: dismissal === "Escape" ? "Filter" : "Filter (1 active)",
      });
      await waitFor(() => expect(trigger).toHaveFocus());
      fireEvent.click(trigger);
      expect(
        screen.getByRole("button", { name: "Status" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Planned" }),
      ).not.toBeInTheDocument();
    } finally {
      animation.mockRestore();
    }
  });
}
