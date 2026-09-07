import { describe, expect, it } from "vitest";
import { campusGridProjection } from "@/lib/rooms/campus-grid-projection";

describe("campus grid projection", () => {
  it.each([1e4, 1e6, 1e8, 1e9])(
    "keeps campus edges and grid coordinates anchored at camera scale %s",
    (scale) => {
      const origin = [0.914, 0.606];
      const size = [0.00012, 0.00009];
      const matrix = [
        scale,
        scale * 0.2,
        0,
        500,
        scale * 0.3,
        -scale,
        0,
        -300,
        0,
        0,
        1,
        0,
        -scale * (origin[0] + 0.3 * origin[1]),
        scale * (origin[1] - 0.2 * origin[0]),
        0,
        1 - 500 * origin[0] + 300 * origin[1],
      ];
      const inverse = campusGridProjection(matrix, origin, size);
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0.5, 0.5],
        [-2, 3],
      ]) {
        const x = origin[0] + size[0] * u;
        const y = origin[1] + size[1] * v;
        const w = matrix[3] * x + matrix[7] * y + matrix[15];
        const screenX = (matrix[0] * x + matrix[4] * y + matrix[12]) / w;
        const screenY = (matrix[1] * x + matrix[5] * y + matrix[13]) / w;
        const divisor =
          inverse[2] * screenX + inverse[5] * screenY + inverse[8];
        expect(
          (inverse[0] * screenX + inverse[3] * screenY + inverse[6]) / divisor,
        ).toBeCloseTo(u, 5);
        expect(
          (inverse[1] * screenX + inverse[4] * screenY + inverse[7]) / divisor,
        ).toBeCloseTo(v, 5);
      }
    },
  );
});
