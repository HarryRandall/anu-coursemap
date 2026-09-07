import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DatabaseScrollPreview } from "@/ui/admin/imports/database-scroll-preview";

afterEach(() => vi.restoreAllMocks());

test("the capped thumb reaches both ends of its track with the content", () => {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(600);
  render(
    <DatabaseScrollPreview label="Rows">
      <p>Content</p>
    </DatabaseScrollPreview>,
  );
  const bar = screen.getByRole("scrollbar", { name: "Rows scrollbar" });
  const viewport = document.getElementById(bar.getAttribute("aria-controls")!)!;
  const thumb = bar.firstElementChild as HTMLElement;
  expect(thumb.style.height).toBe("72px");
  fireEvent.keyDown(bar, { key: "End" });
  fireEvent.scroll(viewport);
  expect(viewport.scrollTop).toBe(300);
  expect(thumb.style.transform).toBe("translateY(224px)");
  expect(bar).toHaveAttribute("aria-valuenow", "300");
  fireEvent.keyDown(bar, { key: "Home" });
  fireEvent.scroll(viewport);
  expect(viewport.scrollTop).toBe(0);
  expect(thumb.style.transform).toBe("translateY(0px)");
});
