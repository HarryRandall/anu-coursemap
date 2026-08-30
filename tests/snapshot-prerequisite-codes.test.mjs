import assert from "node:assert/strict";
import test from "node:test";
import {
  prerequisiteCodesFromSnapshotProjection,
  prerequisiteEdgesWithSnapshotFallback,
  resolvePrerequisiteFallbackDetails,
} from "../lib/coursemap/snapshot-prerequisite-codes.ts";

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

test("derives descriptive prerequisite references from retained source text", () => {
  const projection = {
    courseCode: "COMP3600",
    rules: [
      {
        ruleKind: "prerequisite",
        sourceText:
          "24 units of COMP coded courses AND (6 units of MATH OR COMP1600), but not COMP3600 itself.",
      },
      {
        ruleKind: "incompatibility",
        sourceText: "Incompatible with COMP6466.",
      },
    ],
  };

  assert.deepEqual(prerequisiteCodesFromSnapshotProjection(projection), [
    "COMP1600",
  ]);
});

test("adds locked fallback edges without replacing stored graph edges", () => {
  const storedEdges = [
    {
      from: "COMP1100",
      to: "COMP3600",
      fromIsAvailable: true,
      toIsAvailable: true,
    },
  ];

  assert.deepEqual(
    prerequisiteEdgesWithSnapshotFallback({
      courseCode: "COMP3600",
      projection: {
        courseCode: "COMP3600",
        rules: [
          {
            key: "prerequisite",
            sourceText: "Complete COMP1100 and COMP1600.",
          },
        ],
      },
      storedEdges,
    }),
    [
      ...storedEdges,
      {
        from: "COMP1600",
        to: "COMP3600",
        fromIsAvailable: false,
        toIsAvailable: true,
      },
    ],
  );
});

test("restores availability and the upstream chain for published fallback references", () => {
  assert.deepEqual(
    prerequisiteEdgesWithSnapshotFallback({
      courseCode: "COMP3600",
      projection: {
        courseCode: "COMP3600",
        rules: [
          {
            key: "prerequisite",
            sourceText: "Complete COMP1600.",
          },
        ],
      },
      storedEdges: [],
      fallbackDetails: {
        COMP1600: {
          isAvailable: true,
          prerequisiteEdges: [
            {
              from: "COMP1100",
              to: "COMP1600",
              fromIsAvailable: true,
              toIsAvailable: true,
            },
            {
              from: "COMP1600",
              to: "COMP4670",
              fromIsAvailable: true,
              toIsAvailable: true,
            },
          ],
        },
      },
    }),
    [
      {
        from: "COMP1100",
        to: "COMP1600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
      {
        from: "COMP1600",
        to: "COMP3600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
    ],
  );
});

test("recovers an upstream chain when each older snapshot only retained source text", async () => {
  const projections = {
    COMP1600: {
      courseCode: "COMP1600",
      rules: [
        {
          ruleKey: "prerequisite",
          sourceText: "You must have completed COMP1100.",
        },
      ],
    },
    COMP1100: {
      courseCode: "COMP1100",
      rules: [],
    },
  };
  const loaded = [];
  const fallbackDetails = await resolvePrerequisiteFallbackDetails({
    courseCode: "COMP3600",
    projection: {
      courseCode: "COMP3600",
      rules: [
        {
          ruleKey: "prerequisite",
          sourceText: "You must have completed COMP1600.",
        },
      ],
    },
    storedEdges: [],
    loadNode: async (courseCode) => {
      loaded.push(courseCode);
      return {
        isAvailable: true,
        prerequisiteEdges: [],
        projection: projections[courseCode] ?? null,
      };
    },
  });

  assert.deepEqual(loaded, ["COMP1600", "COMP1100"]);
  assert.deepEqual(
    prerequisiteEdgesWithSnapshotFallback({
      courseCode: "COMP3600",
      fallbackDetails,
      projection: {
        courseCode: "COMP3600",
        rules: [
          {
            ruleKey: "prerequisite",
            sourceText: "You must have completed COMP1600.",
          },
        ],
      },
      storedEdges: [],
    }),
    [
      {
        from: "COMP1100",
        to: "COMP1600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
      {
        from: "COMP1600",
        to: "COMP3600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
    ],
  );
});

test("inspects a stored direct prerequisite for a raw-text-only parent", async () => {
  const fallbackDetails = await resolvePrerequisiteFallbackDetails({
    courseCode: "COMP3600",
    projection: {
      courseCode: "COMP3600",
      ruleCourseReferences: [
        {
          ruleKey: "prerequisite",
          referencedCourseCode: "COMP1600",
        },
      ],
    },
    storedEdges: [
      {
        from: "COMP1600",
        to: "COMP3600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
    ],
    loadNode: async (courseCode) => ({
      isAvailable: true,
      prerequisiteEdges: [],
      projection:
        courseCode === "COMP1600"
          ? {
              courseCode,
              rules: [
                {
                  ruleKey: "prerequisite",
                  sourceText: "You must have completed COMP1100.",
                },
              ],
            }
          : { courseCode, rules: [] },
    }),
  });

  assert.deepEqual(
    prerequisiteEdgesWithSnapshotFallback({
      courseCode: "COMP3600",
      fallbackDetails,
      projection: {
        courseCode: "COMP3600",
        ruleCourseReferences: [
          {
            ruleKey: "prerequisite",
            referencedCourseCode: "COMP1600",
          },
        ],
      },
      storedEdges: [
        {
          from: "COMP1600",
          to: "COMP3600",
          fromIsAvailable: true,
          toIsAvailable: true,
        },
      ],
    }),
    [
      {
        from: "COMP1600",
        to: "COMP3600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
      {
        from: "COMP1100",
        to: "COMP1600",
        fromIsAvailable: true,
        toIsAvailable: true,
      },
    ],
  );
});
