"use client";

import { useState } from "react";
import type { Selection } from "react-aria-components";
import { useListData } from "react-stately";
import type { SelectItemType } from "@uui/components/base/select/select-shared";
import { MultiSelect } from "@uui/components/base/select/multi-select";
import { TagSelect } from "@uui/components/base/select/tag-select";
import { colleges, courses, sessions } from "../content";
import { Example, Stack } from "../section-frame";

const collegeItems = colleges.map((college) => ({
  id: college.id,
  label: college.label,
}));

const courseItems = courses.map((course) => ({
  id: course.id,
  label: course.code,
  supportingText: course.title,
}));

function CollegeMultiSelect() {
  const [selected, setSelected] = useState<Selection>(
    () => new Set(["cecs", "science"]),
  );
  const count = selected === "all" ? collegeItems.length : selected.size;

  return (
    <div className="flex flex-col gap-3">
      <MultiSelect
        label="Colleges"
        placeholder="Filter by college"
        items={collegeItems}
        selectedKeys={selected}
        onSelectionChange={setSelected}
        hint="Remove a college with its cross, or with Backspace from the field."
      >
        {(item) => (
          <MultiSelect.Item id={item.id}>{item.label}</MultiSelect.Item>
        )}
      </MultiSelect>
      <p className="text-sm text-tertiary">
        {count === 0
          ? "No college filter applied, so every course is shown."
          : `Filtering to ${count} of ${collegeItems.length} colleges.`}
      </p>
    </div>
  );
}

function PrerequisiteMultiSelect() {
  const [selected, setSelected] = useState<Selection>(
    () => new Set(["comp1100"]),
  );

  return (
    <MultiSelect
      label="Prerequisites satisfied by"
      placeholder="Choose completed courses"
      items={courseItems}
      selectedKeys={selected}
      onSelectionChange={setSelected}
      hint="Supporting text keeps the full course title visible while you choose."
    >
      {(item) => (
        <MultiSelect.Item id={item.id} supportingText={item.supportingText}>
          {item.label}
        </MultiSelect.Item>
      )}
    </MultiSelect>
  );
}

function SessionTagSelect() {
  const sessionItems = sessions.map((session) => ({
    id: session.id,
    label: session.label,
  }));
  const selectedItems = useListData<SelectItemType>({
    initialItems: sessionItems.slice(0, 1),
  });

  return (
    <div className="flex flex-col gap-3">
      <TagSelect
        label="Teaching periods"
        placeholder="Choose periods"
        items={sessionItems.filter(
          (item) =>
            !selectedItems.items.some((chosen) => chosen.id === item.id),
        )}
        selectedItems={selectedItems}
        onItemInserted={(key) => {
          const item = sessionItems.find((entry) => entry.id === key);
          if (item) selectedItems.append(item);
        }}
        onItemCleared={(key) => selectedItems.remove(key)}
      >
        {(item) => <TagSelect.Item id={item.id}>{item.label}</TagSelect.Item>}
      </TagSelect>
      <p className="text-sm text-tertiary">
        {selectedItems.items.length === 0
          ? "No teaching period chosen."
          : `${selectedItems.items.length} of ${sessionItems.length} periods chosen.`}
      </p>
    </div>
  );
}

export function MultiSelectSection() {
  return (
    <Stack>
      <Example
        title="Multi-select"
        description="Selected values render as removable tags inside the field. The footer offers select-all and reset."
      >
        <div className="max-w-lg">
          <CollegeMultiSelect />
        </div>
      </Example>

      <Example
        title="With supporting text"
        description="Two-line items keep the course title readable while the tag stays short."
      >
        <div className="max-w-lg">
          <PrerequisiteMultiSelect />
        </div>
      </Example>

      <Example
        title="Tag select"
        description="The tag-first variant, where the tags sit above the trigger rather than inside it."
      >
        <div className="max-w-lg">
          <SessionTagSelect />
        </div>
      </Example>

      <Example
        title="States"
        description="Invalid, disabled and an empty source list."
      >
        <div className="flex max-w-lg flex-col gap-5">
          <MultiSelect
            label="Invalid"
            placeholder="Filter by college"
            items={collegeItems}
            isInvalid
            hint="Choose at least one college."
          >
            {(item) => (
              <MultiSelect.Item id={item.id}>{item.label}</MultiSelect.Item>
            )}
          </MultiSelect>
          <MultiSelect
            label="Disabled"
            placeholder="Filter by college"
            items={collegeItems}
            isDisabled
            hint="Locked while the catalogue is importing."
          >
            {(item) => (
              <MultiSelect.Item id={item.id}>{item.label}</MultiSelect.Item>
            )}
          </MultiSelect>
          <MultiSelect
            label="Empty"
            placeholder="Filter by college"
            items={[]}
            hint="No colleges have been imported for this catalogue year."
          >
            {(item) => (
              <MultiSelect.Item id={item.id}>{item.label}</MultiSelect.Item>
            )}
          </MultiSelect>
        </div>
      </Example>
    </Stack>
  );
}
