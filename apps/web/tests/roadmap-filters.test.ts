import { describe, expect, it } from "vitest";
import { filterRoadmapStages } from "@/lib/roadmap";
import type { RoadmapStage } from "@/lib/roadmap";

const stages: RoadmapStage[] = [
  {
    id: "shipped",
    title: "Shipped",
    description: "Available",
    status: "shipped",
    items: [
      {
        title: "Visual planning",
        description: "Arrange semesters",
        area: "plan",
        href: "/plan",
      },
      {
        title: "Discovery",
        description: "Explore prerequisites",
        area: "courses",
      },
    ],
  },
  {
    id: "next",
    title: "Next",
    description: "Planned",
    status: "planned",
    items: [
      {
        title: "Indoor maps",
        description: "Find teaching spaces",
        area: "rooms",
      },
      {
        title: "Compare plans",
        description: "Arrange alternatives",
        area: "plan",
      },
    ],
  },
];

describe("roadmap filters", () => {
  it("combines the search, stage and area without changing the source", () => {
    const result = filterRoadmapStages(
      stages,
      "  ARRANGE   alternatives  ",
      "next",
      "plan",
    );
    expect(result.map((stage) => stage.id)).toEqual(["next"]);
    expect(result[0].items.map((item) => item.title)).toEqual([
      "Compare plans",
    ]);
    expect(stages[1].items).toHaveLength(2);
  });
  it("searches the displayed area name and omits empty stages", () => {
    expect(
      filterRoadmapStages(stages, "room finder", "", "")[0].items[0].title,
    ).toBe("Indoor maps");
    expect(filterRoadmapStages(stages, "unknown feature", "", "")).toEqual([]);
  });
  it("preserves stage order and shipped links when filters are cleared", () => {
    expect(filterRoadmapStages(stages, "", "", "")).toEqual(stages);
  });
});
