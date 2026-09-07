/** Invert the ground-plane projection in double precision before sending it to WebGL. */
export function campusGridProjection(
  matrix: ArrayLike<number>,
  origin: readonly number[],
  size: readonly number[],
) {
  const a = matrix[0] * size[0];
  const b = matrix[4] * size[1];
  const c = matrix[12] + matrix[0] * origin[0] + matrix[4] * origin[1];
  const d = matrix[1] * size[0];
  const e = matrix[5] * size[1];
  const f = matrix[13] + matrix[1] * origin[0] + matrix[5] * origin[1];
  const g = matrix[3] * size[0];
  const h = matrix[7] * size[1];
  const i = matrix[15] + matrix[3] * origin[0] + matrix[7] * origin[1];
  const determinant =
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return new Float32Array(
    [
      e * i - f * h,
      f * g - d * i,
      d * h - e * g,
      c * h - b * i,
      a * i - c * g,
      b * g - a * h,
      b * f - c * e,
      c * d - a * f,
      a * e - b * d,
    ].map((value) => value / determinant),
  );
}
