"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export const courseReviewTabs = [
  { value: "changes", label: "Changes" },
  { value: "fields", label: "All fields" },
  { value: "source", label: "Source HTML" },
  { value: "parsed", label: "Parsed output" },
  { value: "prerequisites", label: "Prerequisites" },
  { value: "student", label: "Student preview" },
] as const;

export type CourseReviewTab = (typeof courseReviewTabs)[number]["value"];

export function CourseReviewTabs() {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <TabsList className="h-auto min-w-max justify-start gap-0 rounded-none bg-transparent p-0">
        {courseReviewTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-12 rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 text-sm text-zinc-500 shadow-none hover:text-zinc-950 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
