import { StrictMode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import { LoadingProgressProvider } from "@/ui/shell/loading-progress-provider";
import { useLoadingProgress } from "@/ui/shell/use-loading-progress";

function Header({ loading }: { loading: boolean }) {
  const ref = useLoadingProgress(loading);
  return <header ref={ref} />;
}

afterEach(() => vi.unstubAllGlobals());

test("a replacement header completes from the outgoing loading position", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  vi.stubGlobal("getComputedStyle", () => ({
    transform: "matrix(0.65, 0, 0, 1, 0, 0)",
  }));
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  const view = render(
    <LoadingProgressProvider>
      <Header key="loading" loading />
    </LoadingProgressProvider>,
    { wrapper: StrictMode },
  );
  expect(animate).not.toHaveBeenCalled();
  view.rerender(
    <LoadingProgressProvider>
      <Header key="content" loading={false} />
    </LoadingProgressProvider>,
  );
  expect(animate).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        transform: "matrix(0.65, 0, 0, 1, 0, 0)",
        opacity: 1,
        offset: 0,
      }),
      expect.objectContaining({ transform: "scaleX(1)", opacity: 1 }),
      expect.objectContaining({
        transform: "scaleX(1)",
        opacity: 0,
        offset: 1,
      }),
    ]),
    expect.objectContaining({ pseudoElement: "::after" }),
  );
  animate.mockClear();
  view.rerender(
    <LoadingProgressProvider>
      <Header key="next" loading={false} />
    </LoadingProgressProvider>,
  );
  expect(animate).not.toHaveBeenCalled();
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});
