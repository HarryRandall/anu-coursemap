"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCoursemap } from "@/app/providers";
import {
  CourseDetailTabsList,
  CourseDetailView,
  courseTabFromSearch,
  type CourseTab,
} from "@/components/courses/course-detail-view";
import { TermChooser } from "@/components/overlays";
import { AppShell } from "@/components/shell";
import { Tabs } from "@/components/ui/tabs";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";
import type { CompletedRequisiteCourse } from "@/lib/coursemap/requisite-summary";

export function CourseDetailClient({
  course,
  requisiteCompletion,
}: {
  course: CatalogueCourse;
  requisiteCompletion: {
    completedCourses: CompletedRequisiteCourse[];
    isAuthenticated: boolean;
  };
}) {
  const { state } = useCoursemap();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CourseTab>(() =>
    courseTabFromSearch(searchParams.get("tab")),
  );
  const [planOpen, setPlanOpen] = useState(false);
  const completedCodes = new Set(
    state.attempts
      .filter((attempt) => attempt.status === "completed")
      .map((attempt) => attempt.courseCode),
  );
  const plannedCodes = new Set(
    state.attempts
      .filter(
        (attempt) =>
          attempt.status === "planned" || attempt.status === "enrolled",
      )
      .map((attempt) => attempt.courseCode),
  );

  useEffect(() => {
    const syncTabFromHistory = () => {
      setActiveTab(
        courseTabFromSearch(
          new URL(window.location.href).searchParams.get("tab"),
        ),
      );
    };
    window.addEventListener("popstate", syncTabFromHistory);
    return () => window.removeEventListener("popstate", syncTabFromHistory);
  }, []);

  const selectTab = (tab: CourseTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => selectTab(value as CourseTab)}
      className="gap-0"
    >
      <AppShell tabs={<CourseDetailTabsList />}>
        <CourseDetailView
          completedCodes={completedCodes}
          course={course}
          onAddToPlan={() => setPlanOpen(true)}
          plannedCodes={plannedCodes}
          requisiteCompletion={requisiteCompletion}
        />
        {planOpen ? (
          <TermChooser course={course} onClose={() => setPlanOpen(false)} />
        ) : null}
      </AppShell>
    </Tabs>
  );
}
