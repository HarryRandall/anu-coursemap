"use client";

import { useState } from "react";
import {
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@uui/components/application/tabs/tabs";
import { requirements } from "@/components/design-system/lab/content";
import type { UntitledTabsReviewId } from "./tabs-review-data";

const standardTabs = [
  { id: "plan", label: "Plan" },
  { id: "requirements", label: "Requirements" },
  { id: "timetable", label: "Timetable" },
  { id: "history", label: "History" },
] as const;

function StandardTabs({
  type,
}: {
  type:
    | "button-brand"
    | "button-gray"
    | "button-border"
    | "button-minimal"
    | "underline";
}) {
  return (
    <Tabs defaultSelectedKey="plan">
      <TabList type={type}>
        {standardTabs.map((tab) => (
          <Tab key={tab.id} {...tab} />
        ))}
      </TabList>
    </Tabs>
  );
}

function BadgeTabs({ size }: { size: "sm" | "md" }) {
  return (
    <Tabs defaultSelectedKey="all">
      <TabList type="button-gray" size={size}>
        <Tab id="all" label="All courses" badge={42} />
        <Tab id="completed" label="Completed" badge={16} />
        <Tab id="planned" label="Planned" badge={8} />
        <Tab id="locked" label="Locked" badge={4} />
      </TabList>
    </Tabs>
  );
}

function LiveTabs() {
  const [selected, setSelected] = useState("compulsory");

  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={(key) => setSelected(String(key))}
      className="flex w-full flex-col gap-5"
    >
      <TabList
        type="underline"
        items={requirements.map((requirement) => ({
          id: requirement.id,
          label: requirement.title,
          badge: `${requirement.completed}/${requirement.required}`,
        }))}
      >
        {(tab) => <Tab {...tab} />}
      </TabList>

      {requirements.map((requirement) => (
        <TabPanel key={requirement.id} id={requirement.id}>
          <div className="flex flex-col gap-3 rounded-lg bg-secondary p-4">
            <p className="text-sm text-secondary">{requirement.detail}</p>
            {requirement.courses.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {requirement.courses.map((code) => (
                  <li
                    key={code}
                    className="rounded-md bg-primary px-2 py-1 font-mono text-xs text-secondary ring-1 ring-secondary"
                  >
                    {code}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-tertiary text-sm">
                No courses counted towards this requirement yet.
              </p>
            )}
          </div>
        </TabPanel>
      ))}
    </Tabs>
  );
}

export function UntitledTabsReviewExample({
  example,
}: {
  example: UntitledTabsReviewId;
}) {
  switch (example) {
    case "untitled:tabs:button-brand":
      return <StandardTabs type="button-brand" />;
    case "untitled:tabs:button-gray":
      return <StandardTabs type="button-gray" />;
    case "untitled:tabs:button-border":
      return <StandardTabs type="button-border" />;
    case "untitled:tabs:button-minimal":
      return <StandardTabs type="button-minimal" />;
    case "untitled:tabs:underline":
      return <StandardTabs type="underline" />;
    case "untitled:tabs:small-badges":
      return <BadgeTabs size="sm" />;
    case "untitled:tabs:medium-badges":
      return <BadgeTabs size="md" />;
    case "untitled:tabs:full-width":
      return (
        <div className="w-full max-w-3xl">
          <Tabs defaultSelectedKey="plan">
            <TabList type="underline" fullWidth>
              <Tab id="plan" label="Plan" />
              <Tab id="requirements" label="Requirements" />
              <Tab id="timetable" label="Timetable" />
            </TabList>
          </Tabs>
        </div>
      );
    case "untitled:tabs:vertical":
      return (
        <Tabs defaultSelectedKey="profile" orientation="vertical">
          <TabList type="line" orientation="vertical" className="w-64">
            <Tab id="profile" label="Profile" />
            <Tab id="programme" label="Programme" />
            <Tab id="notifications" label="Notifications" />
            <Tab id="exports" label="Exports" />
          </TabList>
        </Tabs>
      );
    case "untitled:tabs:panels":
      return <LiveTabs />;
  }
}
