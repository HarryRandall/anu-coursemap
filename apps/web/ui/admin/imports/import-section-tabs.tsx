"use client";

import { SectionTabs } from "@/ui/common/section-tabs";

export function ImportSectionTabs({
  course = false,
  loading = false,
}: {
  course?: boolean;
  loading?: boolean;
}) {
  const tabs = [
    { value: "pipeline", label: "Pipeline" },
    { value: "source", label: "Source and artefacts" },
    { value: "database", label: "Database rows" },
    {
      value: course ? "preview" : "candidate",
      label: course ? "Course preview" : "Preview",
    },
  ];
  return (
    <SectionTabs
      label="Import sections"
      tabs={tabs.map((tab) => ({ ...tab, disabled: loading }))}
    />
  );
}
