"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="min-w-0 flex-1 overflow-x-auto">
      <TabsList className="h-auto min-w-max justify-start gap-0 rounded-none bg-transparent p-0">
        {courseReviewTabs
          .filter((tab) => !tab.importOnly || hasImport)
          .map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-12 rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 text-sm text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
      </TabsList>
    </div>
  );
}
