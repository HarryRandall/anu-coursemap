"use client";
import { TabsList, TabsTrigger } from "@reui/ui/tabs";

export const courseReviewTabs = [
  { value: "pipeline", label: "Pipeline", importOnly: true },
  { value: "course", label: "Course data", importOnly: false },
  { value: "source", label: "Source", importOnly: false },
  { value: "requisites", label: "Requisites", importOnly: false },
  { value: "student", label: "Course preview", importOnly: false },
] as const;

export type CourseReviewTab = (typeof courseReviewTabs)[number]["value"];

export function CourseReviewTabs({ hasImport }: { hasImport: boolean }) {
  return (
    <div className="min-w-max flex-1">
      <TabsList variant="line">
        {courseReviewTabs
          .filter((tab) => !tab.importOnly || hasImport)
          .map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
      </TabsList>
    </div>
  );
}
