import assert from "node:assert/strict";
import test from "node:test";

import { importResultExitCode } from "../scripts/catalogue/import-manifest.mjs";

test("returns a non-zero audit exit for failed import runs", () => {
  assert.equal(importResultExitCode({ status: "succeeded" }), 0);
  assert.equal(importResultExitCode({ status: "failed" }), 2);
  assert.equal(importResultExitCode({ status: "cancelled" }), 2);
  assert.equal(importResultExitCode(undefined), 2);
});
