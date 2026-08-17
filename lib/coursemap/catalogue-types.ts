export type CatalogueCourse = {
  accent: "blue" | "violet" | "mint" | "amber" | "rose" | "cyan";
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
  prerequisiteEdges: CataloguePrerequisiteEdge[];
  /** Published courses which can be opened from requisite prose. */
  availableCourseCodes: string[];
  incompatibilityText: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  publicationStatus: "published" | "draft";
  reviewState: "automatic" | "review" | "verified";
};

export type CataloguePrerequisiteEdge = {
  from: string;
  to: string;
  fromIsAvailable: boolean;
  toIsAvailable: boolean;
};
