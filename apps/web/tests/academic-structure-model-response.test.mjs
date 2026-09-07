import { expect, test } from "vitest";
import { academicStructureModelResponseError } from "../lib/structure-import/model-response-error.ts";
import { buildOpenRouterCourseRequestBody } from "../lib/course-import/openrouter.ts";
import { ACADEMIC_STRUCTURE_IMPORT_MAX_OUTPUT_TOKENS } from "../lib/structure-import/prompt.ts";

test("explains a truncated response instead of the downstream null validation error", () => {
  expect(
    academicStructureModelResponseError({
      finishReason: "length",
      responseError: "Invalid JSON.",
    }),
  ).toContain("output limit");
});
test("retains provider errors and accepts completed responses", () => {
  expect(
    academicStructureModelResponseError({
      finishReason: "stop",
      responseError: "Invalid JSON.",
    }),
  ).toBe("Invalid JSON.");
  expect(
    academicStructureModelResponseError({
      finishReason: "stop",
      responseError: null,
    }),
  ).toBeNull();
});
test("gives structure responses more headroom without changing course imports", () => {
  const input = {
    model: "google/gemini-2.5-flash-lite",
    systemPrompt: "Extract.",
    modelInput: "Source.",
    schema: { type: "object" },
    env: { COURSEMAP_OPENROUTER_MODELS: "google/gemini-2.5-flash-lite" },
  };
  expect(
    buildOpenRouterCourseRequestBody({
      ...input,
      maxOutputTokens: ACADEMIC_STRUCTURE_IMPORT_MAX_OUTPUT_TOKENS,
    }).max_tokens,
  ).toBe(24_000);
  expect(buildOpenRouterCourseRequestBody(input).max_tokens).toBe(12_000);
});
