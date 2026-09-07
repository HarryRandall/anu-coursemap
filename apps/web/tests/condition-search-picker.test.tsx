import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SearchPicker } from "@/ui/admin/requisites/condition-search-picker";
import { simulateOverlayAnimation } from "./helpers/overlay-animation";

vi.mock("@/lib/coursemap/requisite-search-actions", () => ({
  searchRequisiteCourses: vi.fn(),
  searchRequisiteProgrammes: vi.fn(),
}));

for (const label of ["Course", "Programme"]) {
  test(`${label} search retains results throughout dismissal and resets when reopened`, async () => {
    const animation = simulateOverlayAnimation();
    const scroll = vi.fn();
    const originalScroll = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    try {
      render(
        <SearchPicker
          label={label}
          empty="No matches."
          onSearch={async () => [{ code: "COMP3600", title: "Algorithms" }]}
          onSelect={vi.fn()}
          value=""
        />,
      );
      const trigger = screen.getByRole("button", { name: label });
      fireEvent.click(trigger);
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "COMP" },
      });
      const result = await screen.findByRole("option", { name: /Algorithms/ });
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(result).toBeInTheDocument();
      expect(screen.queryByText("No matches.")).not.toBeInTheDocument();
      const exit = new Event("animationend", { bubbles: true });
      Object.defineProperty(exit, "animationName", { value: "overlay-exit" });
      fireEvent(screen.getByRole("dialog", { hidden: true }), exit);
      await waitFor(() => expect(trigger).toHaveFocus());
      fireEvent.click(trigger);
      expect(screen.getByRole("combobox")).toHaveValue("");
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
      expect(screen.getByText("Type a code or title.")).toBeInTheDocument();
    } finally {
      animation.mockRestore();
      HTMLElement.prototype.scrollIntoView = originalScroll;
    }
  });
}
