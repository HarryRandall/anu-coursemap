"use client";
import { TabsList, TabsTrigger } from "@coursemap/ui/primitives/tabs";

export const courseReviewTabs = [
  { value: "course", label: "Course data", importOnly: false },
  { value: "requisites", label: "Requisites", importOnly: false },
  { value: "student", label: "Course preview", importOnly: false },
  { value: "source", label: "Source", importOnly: false },
  { value: "pipeline", label: "Pipeline", importOnly: true },
] as const;

export type CourseReviewTab = (typeof courseReviewTabs)[number]["value"];

export function CourseReviewTabs({
  hasImport,
  editing = false,
  activeTab,
}: {
  hasImport: boolean;
  editing?: boolean;
  activeTab?: CourseReviewTab;
}) {
  return (
    <div className="min-w-max flex-1">
      <TabsList variant="line">
        {courseReviewTabs
          .filter((tab) => !tab.importOnly || hasImport)
          .map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={editing && tab.value !== activeTab}
            >
              {tab.label}
            </TabsTrigger>
          ))}
      </TabsList>
    </div>
  );
}
