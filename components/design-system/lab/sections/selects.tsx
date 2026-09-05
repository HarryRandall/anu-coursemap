"use client";

import { useState } from "react";
import { Building07, GraduationHat01 } from "@untitledui/icons";
import { Select } from "@uui/components/base/select/select";
import { NativeSelect } from "@uui/components/base/select/select-native";
import { colleges, courses, sessions } from "../content";
import { Example, Grid, Stack } from "../section-frame";

const sessionItems = sessions.map((session) => ({
  id: session.id,
  label: session.label,
}));

const collegeItems = colleges.map((college) => ({
  id: college.id,
  label: college.label,
}));

const richItems = courses.slice(0, 6).map((course) => ({
  id: course.id,
  label: `${course.code} ${course.title}`,
  supportingText: `${course.units} units · ${course.session}`,
}));

function ControlledSelect() {
  const [selected, setSelected] = useState<string | number | null>("2026-s1");
  const chosen = sessions.find((session) => session.id === selected);

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Teaching period"
        placeholder="Choose a teaching period"
        items={sessionItems}
        selectedKey={selected}
        onSelectionChange={setSelected}
      >
        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
      </Select>
      <p className="text-tertiary text-sm">
        {chosen
          ? `Planning for ${chosen.label}.`
          : "No teaching period chosen."}
      </p>
    </div>
  );
}

export function SelectsSection() {
  return (
    <Stack>
      <Example
        title="Sizes"
        description="Three sizes, matching the input scale."
      >
        <Grid cols={3}>
          {(["sm", "md", "lg"] as const).map((size) => (
            <Select
              key={size}
              size={size}
              label={`Teaching period (${size})`}
              placeholder="Choose a period"
              items={sessionItems}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
          ))}
        </Grid>
      </Example>

      <Example
        title="Controlled selection"
        description="Open the menu with Space or Enter, move with the arrow keys and choose with Enter. The paragraph below reflects the live selection."
      >
        <div className="max-w-md">
          <ControlledSelect />
        </div>
      </Example>

      <Example
        title="Rich items"
        description="Two-line items with supporting text, for long course names."
      >
        <div className="max-w-lg">
          <Select
            label="Course"
            placeholder="Choose a course"
            items={richItems}
            hint="Supporting text carries the unit value and teaching period."
          >
            {(item) => (
              <Select.Item id={item.id} supportingText={item.supportingText}>
                {item.label}
              </Select.Item>
            )}
          </Select>
        </div>
      </Example>

      <Example
        title="With icons"
        description="A leading icon on the trigger, and per-item icons in the list."
      >
        <Grid cols={2}>
          <Select
            label="College"
            placeholder="Choose a college"
            icon={Building07}
            items={collegeItems}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
          <Select
            label="Programme"
            placeholder="Choose a programme"
            icon={GraduationHat01}
            items={[
              { id: "bac", label: "Bachelor of Advanced Computing" },
              { id: "bsc", label: "Bachelor of Science" },
              { id: "bph", label: "Bachelor of Philosophy" },
            ]}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </Grid>
      </Example>

      <Example title="States" description="Invalid, disabled and required.">
        <Grid cols={3}>
          <Select
            label="Invalid"
            placeholder="Choose a period"
            items={sessionItems}
            isInvalid
            hint="Choose a teaching period before adding courses."
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
          <Select
            label="Disabled"
            placeholder="Choose a period"
            items={sessionItems}
            isDisabled
            hint="Locked while the plan is under review."
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
          <Select
            label="Required"
            placeholder="Choose a period"
            items={sessionItems}
            isRequired
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </Grid>
      </Example>

      <Example
        title="Native select"
        description="The platform control, for dense administrative forms where the native picker is preferable on mobile."
      >
        <Grid cols={2}>
          <NativeSelect
            label="Teaching period"
            options={sessionItems.map((item) => ({
              label: item.label,
              value: String(item.id),
            }))}
          />
          <NativeSelect
            label="College"
            disabled
            options={collegeItems.map((item) => ({
              label: item.label,
              value: String(item.id),
            }))}
          />
        </Grid>
      </Example>
    </Stack>
  );
}
