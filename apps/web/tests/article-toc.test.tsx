import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ArticleToc } from "@/ui/help/article-toc";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("selects the final section at the page end and follows earlier sections when scrolling back", () => {
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("scrollY", 1200);
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
    2000,
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 0;
  });
  // The final short section cannot reach the reading line before scrolling ends.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return { top: this.id === "last" ? 600 : 100 } as DOMRect;
    },
  );

  render(
    <>
      <section id="first">First section</section>
      <section id="last">Final section</section>
      <ArticleToc
        items={[
          { id: "first", label: "First" },
          { id: "last", label: "Last" },
        ]}
      />
    </>,
  );

  expect(screen.getByRole("link", { name: "Last" })).toHaveAttribute(
    "aria-current",
    "location",
  );
  vi.stubGlobal("scrollY", 900);
  fireEvent.scroll(window);
  expect(screen.getByRole("link", { name: "First" })).toHaveAttribute(
    "aria-current",
    "location",
  );
  expect(screen.getByRole("link", { name: "Last" })).not.toHaveAttribute(
    "aria-current",
  );
});
