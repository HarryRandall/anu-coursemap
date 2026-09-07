import { describe, expect, it } from "vitest";
import {
  averageMark,
  parsePreviewResult,
} from "../ui/academic/previews/preview-data";

describe("academic preview results", () => {
  it("accepts zero and decimal marks but rejects blank and out-of-range input", () => {
    expect(parsePreviewResult("mark", "0").result?.mark).toBe(0);
    expect(parsePreviewResult("mark", "82.5").result?.mark).toBe(82.5);
    for (const input of ["", "101", "-1", "eight", "NaN"])
      expect(parsePreviewResult("mark", input).error).toBeTruthy();
  });
  it("records supplementary pass as 50 with its distinct code", () => {
    expect(parsePreviewResult("PS", "82").result).toEqual({
      mark: 50,
      resultCode: "PS",
    });
  });
  it("does not turn non-numeric results into zero marks", () => {
    const result = parsePreviewResult("CRS", "82").result;
    expect(result).toEqual({ mark: undefined, resultCode: "CRS" });
    expect(
      averageMark([
        { code: "A", name: "A", term: "2026-s1", mark: 80 },
        { code: "B", name: "B", term: "2026-s1", ...result },
      ]),
    ).toBe("80.0");
  });
  it("keeps an editable numeric mark for NCN", () => {
    expect(parsePreviewResult("NCN", "0").result).toEqual({
      mark: 0,
      resultCode: "NCN",
    });
    expect(parsePreviewResult("NCN", "24").result).toEqual({
      mark: 24,
      resultCode: "NCN",
    });
    expect(parsePreviewResult("NCN", "101").error).toBeTruthy();
  });
});
