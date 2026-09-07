import { vi } from "vitest";

export function simulateOverlayAnimation() {
  const getStyle = window.getComputedStyle.bind(window);
  // jsdom has no animation engine or live computed styles. Keep Radix's exit
  // presence active until the test explicitly finishes the animation.
  return vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = getStyle(element);
    if (
      !element.matches(
        '[data-slot="dialog-content"], [data-slot="popover-content"]',
      )
    ) {
      return style;
    }
    return new Proxy(style, {
      get(target, property) {
        if (property === "animationName") {
          return element.getAttribute("data-state") === "closed"
            ? "overlay-exit"
            : "overlay-enter";
        }
        return Reflect.get(target, property, target);
      },
    });
  });
}
