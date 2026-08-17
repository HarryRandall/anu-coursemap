export type Accent = "blue" | "violet" | "mint" | "amber" | "rose" | "cyan";

export type Course = {
  code: string;
  name: string;
  year: number;
  units: number;
  level: number;
  subject: string;
  school: string;
  convener: string;
  sessions: string[];
  delivery: string;
  description: string;
  prerequisiteText: string;
  prerequisiteCodes: string[];
  corequisiteText?: string;
  incompatibilities: string[];
  permissionText?: string;
  countsTowards: string[];
  sourceUrl: string;
  lastChanged: string;
  parseState: "Verified" | "Automatic" | "Review";
  accent: Accent;
};

export type Degree = {
  code: string;
  name: string;
  units: number;
  duration: number;
  college: string;
  description: string;
};

export type Major = {
  code: string;
  name: string;
  units: number;
  colour: string;
  description: string;
  courseCodes: string[];
};

export type AttemptStatus = "completed" | "failed" | "planned" | "enrolled";

export type Attempt = {
  id: string;
  courseCode: string;
  termId: string;
  status: AttemptStatus;
  mark?: number;
  permissionApproved?: boolean;
  overloadApproved?: boolean;
};

export type Term = {
  id: string;
  year: number;
  name: string;
  shortName: string;
  dates: string;
};

export type Relation = {
  id: string;
  source: string;
  relation: string;
  target: string;
  group: string;
  hardness: "Hard" | "Advisory" | "Allocation";
  confidence: number;
  state: "Verified" | "Automatic" | "Review";
  sourceText: string;
};
