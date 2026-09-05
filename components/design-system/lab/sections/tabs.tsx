"use client";

import { useState } from "react";
import {
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@uui/components/application/tabs/tabs";
import { requirements } from "../content";
import { Example, Stack } from "../section-frame";

const horizontalTypes = [
  "button-brand",
  "button-gray",
  "button-border",
  "button-minimal",
  "underline",
] as const;

function LiveTabs() {
  const [selected, setSelected] = useState("compulsory");

  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={(key) => setSelected(String(key))}
      className="flex flex-col gap-5"
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
              <p className="text-sm text-tertiary">
                No courses counted towards this requirement yet.
              </p>
            )}
          </div>
        </TabPanel>
      ))}
    </Tabs>
  );
}

export function TabsSection() {
  return (
    <Stack>
      <Example
        title="Horizontal types"
        description="Five horizontal styles. Arrow keys move the selection and the panel follows."
      >
        <div className="flex flex-col gap-8">
          {horizontalTypes.map((type) => (
            <div key={type} className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">
                {type}
              </p>
              <Tabs defaultSelectedKey="plan">
                <TabList type={type}>
                  <Tab id="plan" label="Plan" />
                  <Tab id="requirements" label="Requirements" />
                  <Tab id="timetable" label="Timetable" />
                  <Tab id="history" label="History" />
                </TabList>
              </Tabs>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Sizes and badges"
        description="Two sizes, with optional count badges."
      >
        <div className="flex flex-col gap-8">
          {(["sm", "md"] as const).map((size) => (
            <div key={size} className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">
                {size}
              </p>
              <Tabs defaultSelectedKey="all">
                <TabList type="button-gray" size={size}>
                  <Tab id="all" label="All courses" badge={42} />
                  <Tab id="completed" label="Completed" badge={16} />
                  <Tab id="planned" label="Planned" badge={8} />
                  <Tab id="locked" label="Locked" badge={4} />
                </TabList>
              </Tabs>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Full width"
        description="Tabs that stretch to fill the container, for narrow panels."
      >
        <Tabs defaultSelectedKey="plan">
          <TabList type="underline" fullWidth>
            <Tab id="plan" label="Plan" />
            <Tab id="requirements" label="Requirements" />
            <Tab id="timetable" label="Timetable" />
          </TabList>
        </Tabs>
      </Example>

      <Example
        title="Vertical"
        description="Vertical orientation for settings-style navigation. The line type is vertical only."
      >
        <Tabs defaultSelectedKey="profile" orientation="vertical">
          <TabList type="line" orientation="vertical" className="max-w-64">
            <Tab id="profile" label="Profile" />
            <Tab id="programme" label="Programme" />
            <Tab id="notifications" label="Notifications" />
            <Tab id="exports" label="Exports" />
          </TabList>
        </Tabs>
      </Example>

      <Example
        title="With panels"
        description="A controlled tab set with real panels, badges and an empty state."
      >
        <LiveTabs />
      </Example>
    </Stack>
  );
}
