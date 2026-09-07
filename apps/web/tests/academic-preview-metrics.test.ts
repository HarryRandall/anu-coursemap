import { describe, expect, it } from "vitest";
import {
  formatPreviewMark,
  previewGpa,
  previewWam,
} from "../lib/academic/preview-metrics";

describe("preview academic metrics", () => {
  it("weights marks and grade points by units", () => {
    const courses = [
      { mark: 80, units: 6 },
      { mark: 50, units: 12 },
    ];
    expect(previewWam(courses)).toBe(60);
    expect(previewGpa(courses)).toBe(5);
  });
  it("includes supplementary passes and failed outcomes in GPA, excluding ungraded results", () => {
    expect(
      previewGpa([
        { resultCode: "PS" },
        { resultCode: "NCN" },
        { resultCode: "WN" },
        { resultCode: "CRS" },
        { resultCode: "RP" },
      ]),
    ).toBeCloseTo(4 / 3);
    expect(previewWam([{ mark: 80 }, { resultCode: "NCN" }])).toBe(80);
  });
  it("distinguishes no eligible results from a zero GPA", () => {
    expect(previewGpa([{ resultCode: "CRS" }])).toBeNull();
    expect(previewGpa([{ mark: 0 }])).toBe(0);
    expect(previewWam([])).toBeNull();
  });
  it("removes redundant decimal zeroes while preserving fractional marks", () => {
    expect(formatPreviewMark(82)).toBe("82");
    expect(formatPreviewMark(73.666)).toBe("73.7");
  });
});
