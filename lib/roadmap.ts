export const roadmapAreas = [
  "planning",
  "catalogue",
  "admin",
  "campus",
] as const;

export type RoadmapArea = (typeof roadmapAreas)[number];
export type RoadmapStage = "shipped" | "now" | "next" | "later";
export type RoadmapIconName =
  | "map"
  | "search"
  | "layout"
  | "lock"
  | "keyboard"
  | "database"
  | "list"
  | "shield"
  | "import"
  | "calendar"
  | "award"
  | "pin"
  | "clock"
  | "gauge"
  | "git"
  | "share"
  | "bell"
  | "split"
  | "smartphone";

export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  area: RoadmapArea;
  icon: RoadmapIconName;
  votes: number;
  owner: string;
  version?: string;
  progress?: number;
  quarter?: string;
};

export const roadmapAreaLabels: Record<RoadmapArea, string> = {
  planning: "Planning",
  catalogue: "Catalogue",
  admin: "Admin",
  campus: "Campus",
};

export const roadmapItems: Record<RoadmapStage, RoadmapItem[]> = {
  shipped: [
    {
      id: "visual-planning",
      title: "Visual degree planning",
      description:
        "Build a semester-by-semester plan and move courses as it changes.",
      area: "planning",
      icon: "map",
      votes: 86,
      owner: "Plan studio",
      version: "v0.8",
    },
    {
      id: "course-discovery",
      title: "Course and prerequisite discovery",
      description: "Search courses and walk the full prerequisite chain.",
      area: "catalogue",
      icon: "search",
      votes: 74,
      owner: "Data desk",
      version: "v0.8",
    },
    {
      id: "student-workspace",
      title: "Student workspace",
      description:
        "Home, academic history, requirements, calendar and support pages.",
      area: "planning",
      icon: "layout",
      votes: 41,
      owner: "Plan studio",
      version: "v0.7",
    },
    {
      id: "password-sign-in",
      title: "Password sign-in",
      description: "Keep a plan attached to an account across devices.",
      area: "admin",
      icon: "lock",
      votes: 29,
      owner: "Access",
      version: "v0.6",
    },
    {
      id: "keyboard-search",
      title: "Keyboard course search",
      description: "Jump to a course from anywhere with the search palette.",
      area: "catalogue",
      icon: "keyboard",
      votes: 33,
      owner: "Data desk",
      version: "v0.8",
    },
  ],
  now: [
    {
      id: "catalogue-coverage",
      title: "Catalogue coverage",
      description:
        "Broaden degree, major and course data while keeping its source visible.",
      area: "catalogue",
      icon: "database",
      votes: 91,
      owner: "Data desk",
      progress: 68,
      quarter: "Now",
    },
    {
      id: "requirement-accuracy",
      title: "Requirement accuracy",
      description:
        "Improve allocation detail and flag rules that still need review.",
      area: "catalogue",
      icon: "list",
      votes: 64,
      owner: "Data desk",
      progress: 41,
      quarter: "Now",
    },
    {
      id: "account-admin",
      title: "Account administration",
      description:
        "Make access and support workflows safer for the Coursemap team.",
      area: "admin",
      icon: "shield",
      votes: 22,
      owner: "Access",
      progress: 22,
      quarter: "Now",
    },
    {
      id: "programme-import",
      title: "Programme import review",
      description:
        "Bring structured programme rules in with provenance, not guesswork.",
      area: "catalogue",
      icon: "import",
      votes: 47,
      owner: "Data desk",
      progress: 55,
      quarter: "Now",
    },
  ],
  next: [
    {
      id: "assessment-calendar",
      title: "Assessment calendar",
      description:
        "Bring assessments and important dates into the study calendar.",
      area: "planning",
      icon: "calendar",
      votes: 58,
      owner: "Plan studio",
      quarter: "Next",
    },
    {
      id: "credit-exemptions",
      title: "Credit and exemptions",
      description:
        "Represent recognised prior learning without overstating official status.",
      area: "planning",
      icon: "award",
      votes: 44,
      owner: "Plan studio",
      quarter: "Next",
    },
    {
      id: "room-finder",
      title: "Room Finder",
      description: "Search campus spaces, facilities and accessible routes.",
      area: "campus",
      icon: "pin",
      votes: 39,
      owner: "Campus ops",
      quarter: "Next",
    },
    {
      id: "clash-timetable",
      title: "Clash-aware timetable",
      description:
        "Surface overlapping classes once offering times are trustworthy.",
      area: "planning",
      icon: "clock",
      votes: 71,
      owner: "Plan studio",
      quarter: "Next",
    },
    {
      id: "study-load",
      title: "Study load warnings",
      description:
        "Flag heavy semesters before they turn into an overloaded year.",
      area: "planning",
      icon: "gauge",
      votes: 36,
      owner: "Plan studio",
      quarter: "Next",
    },
  ],
  later: [
    {
      id: "compare-options",
      title: "Compare degree options",
      description:
        "Try another major or programme without changing your saved plan.",
      area: "planning",
      icon: "git",
      votes: 52,
      owner: "Plan studio",
      quarter: "Later",
    },
    {
      id: "share-export",
      title: "Share and export",
      description:
        "Create a clear plan summary for advisers or your own records.",
      area: "planning",
      icon: "share",
      votes: 48,
      owner: "Plan studio",
      quarter: "Later",
    },
    {
      id: "planning-reminders",
      title: "Planning reminders",
      description:
        "Choose useful reminders for deadlines and unresolved plan items.",
      area: "planning",
      icon: "bell",
      votes: 27,
      owner: "Plan studio",
      quarter: "Later",
    },
    {
      id: "what-if",
      title: "What-if enrolment scenarios",
      description:
        "Fork a plan, test a different path, then keep or discard it.",
      area: "planning",
      icon: "split",
      votes: 61,
      owner: "Plan studio",
      quarter: "Later",
    },
    {
      id: "mobile-companion",
      title: "Mobile companion",
      description:
        "A tighter view for checking a plan and rooms between classes.",
      area: "campus",
      icon: "smartphone",
      votes: 34,
      owner: "Campus ops",
      quarter: "Later",
    },
  ],
};

export const roadmapStages: Array<{
  id: RoadmapStage;
  title: string;
  description: string;
}> = [
  {
    id: "shipped",
    title: "Shipped",
    description: "Live in Coursemap now",
  },
  {
    id: "now",
    title: "Now",
    description: "The current product focus",
  },
  {
    id: "next",
    title: "Next",
    description: "Useful additions we want to explore",
  },
  {
    id: "later",
    title: "Later",
    description: "Ideas without a committed date",
  },
];

export function parseRoadmapArea(value?: string | string[]) {
  const area = Array.isArray(value) ? value[0] : value;
  return roadmapAreas.find((item) => item === area);
}

export function filterRoadmapItems(area?: RoadmapArea) {
  if (!area) return roadmapItems;
  return {
    shipped: roadmapItems.shipped.filter((item) => item.area === area),
    now: roadmapItems.now.filter((item) => item.area === area),
    next: roadmapItems.next.filter((item) => item.area === area),
    later: roadmapItems.later.filter((item) => item.area === area),
  };
}
