export type RoadmapStatus = "shipped" | "now" | "planned" | "exploring";

/** Product area an item belongs to. Maps to the sidebar icon for that route. */
export type RoadmapArea =
  | "plan"
  | "courses"
  | "requirements"
  | "academic"
  | "calendar"
  | "key-dates"
  | "rooms"
  | "profile"
  | "admin"
  | "coursemap";

export type RoadmapItem = {
  title: string;
  description: string;
  area: RoadmapArea;
  /** Where to open a shipped item. */
  href?: string;
};

export type RoadmapStage = {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  items: RoadmapItem[];
};

export const roadmapAreas: Record<RoadmapArea, string> = {
  plan: "Plan",
  courses: "Courses",
  requirements: "Requirements",
  academic: "Academic",
  calendar: "Calendar",
  "key-dates": "Key dates",
  rooms: "Room finder",
  profile: "Profile",
  admin: "Admin",
  coursemap: "Coursemap",
};

export function filterRoadmapStages(
  stages: RoadmapStage[],
  query: string,
  stageId: string,
  area: string,
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return stages
    .filter((stage) => !stageId || stage.id === stageId)
    .map((stage) => ({
      ...stage,
      items: stage.items.filter((item) => {
        const text =
          `${item.title} ${item.description} ${roadmapAreas[item.area]}`.toLowerCase();
        return (
          (!area || item.area === area) &&
          terms.every((term) => text.includes(term))
        );
      }),
    }))
    .filter((stage) => stage.items.length > 0);
}
