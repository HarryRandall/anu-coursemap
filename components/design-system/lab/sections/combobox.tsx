"use client";

import { useMemo, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { Select } from "@uui/components/base/select/select";
import { courses } from "../content";
import { Example, Stack } from "../section-frame";

const courseItems = courses.map((course) => ({
  id: course.id,
  label: `${course.code} ${course.title}`,
  supportingText: `${course.units} units · ${course.college}`,
}));

function CourseComboBox() {
  const [selected, setSelected] = useState<string | number | null>(null);
  const chosen = courses.find((course) => course.id === selected);

  return (
    <div className="flex flex-col gap-3">
      <Select.ComboBox
        label="Find a course"
        placeholder="Start typing a code or title"
        items={courseItems}
        selectedKey={selected}
        onSelectionChange={setSelected}
        hint="Filters as you type. Arrow keys move through the results."
      >
        {(item) => (
          <Select.Item id={item.id} supportingText={item.supportingText}>
            {item.label}
          </Select.Item>
        )}
      </Select.ComboBox>
      <p className="text-tertiary text-sm">
        {chosen
          ? `${chosen.code} runs in ${chosen.session} and is convened by ${chosen.convener}.`
          : "Nothing selected yet."}
      </p>
    </div>
  );
}

function FilteredSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter(
      (course) =>
        course.code.toLowerCase().includes(needle) ||
        course.title.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <Select.ComboBox
        label="Course catalogue"
        placeholder="Search 2026 courses"
        icon={SearchLg}
        shortcut
        items={results.map((course) => ({
          id: course.id,
          label: `${course.code} ${course.title}`,
        }))}
        inputValue={query}
        onInputChange={setQuery}
        allowsEmptyCollection
        menuTrigger="focus"
      >
        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
      </Select.ComboBox>

      <div className="rounded-lg bg-secondary p-4">
        {results.length === 0 ? (
          <p className="text-tertiary text-sm">
            No course matches &ldquo;{query}&rdquo;. Try a code such as
            COMP1100.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {results.map((course) => (
              <li key={course.id} className="text-sm text-secondary">
                <span className="text-quaternary font-mono text-xs">
                  {course.code}
                </span>{" "}
                {course.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ComboboxSection() {
  return (
    <Stack>
      <Example
        title="Course combobox"
        description="Type-ahead over the catalogue. Selection is controlled, and the summary below updates from the chosen course."
      >
        <div className="max-w-lg">
          <CourseComboBox />
        </div>
      </Example>

      <Example
        title="Search that drives a list"
        description="The same component wired as a search field. The list beneath is filtered by the live input value and shows a real empty state."
      >
        <div className="max-w-2xl">
          <FilteredSearch />
        </div>
      </Example>

      <Example
        title="States"
        description="Invalid, disabled and empty collection."
      >
        <div className="flex max-w-lg flex-col gap-5">
          <Select.ComboBox
            label="Invalid"
            placeholder="Search courses"
            items={courseItems}
            isInvalid
            hint="Choose a course from the list."
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select.ComboBox>
          <Select.ComboBox
            label="Disabled"
            placeholder="Search courses"
            items={courseItems}
            isDisabled
            hint="Locked while the catalogue is importing."
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select.ComboBox>
          <Select.ComboBox
            label="Empty catalogue"
            placeholder="Search courses"
            items={[]}
            allowsEmptyCollection
            hint="No courses have been imported for this year yet."
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select.ComboBox>
        </div>
      </Example>
    </Stack>
  );
}
