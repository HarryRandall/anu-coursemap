import { expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

/** Hit-testing catches square descendants escaping a rounded surface, including sticky headers. */
export async function expectRoundedCorners(surface: Locator) {
  for (const edge of ["start", "end"] as const) {
    await surface.evaluate(
      (element, block) => element.scrollIntoView({ block }),
      edge,
    );
    const corners = await surface.evaluate((element, block) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const top = block === "start";
      return ["left", "right"].map((side) => {
        const left = side === "left";
        const radius = parseFloat(
          top
            ? left
              ? style.borderTopLeftRadius
              : style.borderTopRightRadius
            : left
              ? style.borderBottomLeftRadius
              : style.borderBottomRightRadius,
        );
        const inset = Math.max(1, radius * 0.15);
        const x = left ? bounds.left + inset : bounds.right - inset;
        const y = top ? bounds.top + inset : bounds.bottom - inset;
        const hit = document.elementFromPoint(x, y);
        return {
          corner: `${top ? "top" : "bottom"}-${side}`,
          radius,
          x,
          y,
          left,
          top,
          inViewport: x > 0 && x < innerWidth && y > 0 && y < innerHeight,
          paintsOutsideCurve: Boolean(hit && element.contains(hit)),
        };
      });
    }, edge);
    for (const corner of corners) {
      expect(
        corner.radius,
        `${corner.corner} must remain rounded`,
      ).toBeGreaterThan(4);
      expect(corner.inViewport, `${corner.corner} must be reachable`).toBe(
        true,
      );
      expect(
        corner.paintsOutsideCurve,
        `${corner.corner} lets a child cover the curve`,
      ).toBe(false);
      const image = await surface.page().screenshot({
        clip: {
          x: Math.floor(corner.x - 3),
          y: Math.floor(corner.y),
          width: 7,
          height: 1,
        },
        scale: "css",
      });
      const difference = await surface.page().evaluate(
        async ({ png, left }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${png}`;
          await image.decode();
          const canvas = new OffscreenCanvas(7, 1);
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const inside = context.getImageData(3, 0, 1, 1).data;
          const outside = context.getImageData(
            left ? 0 : 6,
            top ? 0 : 6,
            1,
            1,
          ).data;
          return Math.max(
            ...[0, 1, 2].map((channel) =>
              Math.abs(inside[channel] - outside[channel]),
            ),
          );
        },
        { png: image.toString("base64"), left: corner.left, top: corner.top },
      );
      expect(
        difference,
        `${corner.corner} paints over the background outside its curve`,
      ).toBeLessThanOrEqual(16);
    }
  }
}
