import assert from "node:assert/strict";
import test from "node:test";
import { prerequisiteCodesFromSnapshotProjection } from "../lib/coursemap/snapshot-prerequisite-codes.ts";

test("derives prerequisite codes only from one snapshot projection", () => {
  const projection = {
    prerequisiteCodes: ["COMP1100"],
    ruleConditions: [
      {
        key: "prerequisite:condition:direct",
        ruleKey: "prerequisite",
        requiredCourseCode: "comp1110",
      },
      {
        key: "prerequisite:condition:set",
        ruleKey: "prerequisite",
        requiredCourseCode: null,
      },
      {
        key: "incompatibility:condition:direct",
        ruleKey: "incompatibility",
        requiredCourseCode: "COMP2120",
      },
    ],
    ruleConditionCourses: [
      {
        conditionKey: "prerequisite:condition:set",
        sourceCourseCode: "COMP1130",
      },
      {
        conditionKey: "incompatibility:condition:direct",
        sourceCourseCode: "COMP2300",
      },
    ],
    ruleCourseReferences: [
      {
        ruleKey: "prerequisite",
        referencedCourseCode: "COMP1710",
      },
      {
        ruleKey: "incompatibility",
        referencedCourseCode: "COMP3600",
      },
    ],
  };

  assert.deepEqual(prerequisiteCodesFromSnapshotProjection(projection), [
    "COMP1100",
    "COMP1110",
    "COMP1130",
    "COMP1710",
  ]);
});
