import { expect, test } from "vitest";
import {
  estimatedImportCost,
  formatImportPrice,
} from "../lib/admin/import-model";
import { readCatalogueModel } from "../lib/admin/model-catalogue";

test("converts OpenRouter per-token rates into a compact estimate without confusing dollars and cents", () => {
  const model = readCatalogueModel(
    {
      data: [
        {
          id: "google/test",
          name: "Google: Test",
          pricing: { prompt: "0.00000025", completion: "0.0000015" },
        },
      ],
    },
    "google/test",
  );
  expect(model.provider).toBe("Google");
  expect(model.input_usd_per_million).toBe(0.25);
  expect(estimatedImportCost(model)).toBe(0.0055);
  expect(formatImportPrice(estimatedImportCost(model))).toBe("0.55¢");
  expect(formatImportPrice(0.00003)).toBe("0.003¢");
  expect(formatImportPrice(0.04)).toBe("$0.04");
  expect(formatImportPrice(0)).toBe("$0");
  expect(formatImportPrice(0.0000001)).toBe("<0.001¢");
});

test("unknown and invalid rates are never presented as free", () => {
  const model = readCatalogueModel(
    {
      data: [
        {
          id: "test/model",
          name: "Model",
          pricing: { prompt: "-1", completion: "" },
        },
      ],
    },
    "test/model",
  );
  expect(estimatedImportCost(model)).toBeNull();
  expect(formatImportPrice(null)).toBe("—");
  expect(() => readCatalogueModel({ data: [] }, "test/model")).toThrow(
    /not found/,
  );
});
