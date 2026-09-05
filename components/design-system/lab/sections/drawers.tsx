"use client";

import { useState } from "react";
import { Button } from "@uui/components/base/buttons/button";
import { Checkbox } from "@uui/components/base/checkbox/checkbox";
import { Input } from "@uui/components/base/input/input";
import { Select } from "@uui/components/base/select/select";
import { TextArea } from "@uui/components/base/textarea/textarea";
import { SlideoutMenu } from "@uui/components/application/slideout-menus/slideout-menu";
import { colleges, courses, sessions } from "../content";
import { Example, Stack, Variants } from "../section-frame";

function FilterDrawer() {
  const [applied, setApplied] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <SlideoutMenu.Trigger>
        <Button color="secondary">Open filter drawer</Button>

        <SlideoutMenu isDismissable>
          {({ close }) => (
            <>
              <SlideoutMenu.Header onClose={close}>
                <h2 className="text-lg font-semibold text-primary">
                  Filter the catalogue
                </h2>
                <p className="text-tertiary text-sm">
                  Narrow 1,284 courses down to the ones you can actually take.
                </p>
              </SlideoutMenu.Header>

              <SlideoutMenu.Content className="flex flex-col gap-5">
                <Input label="Course code" placeholder="COMP" />
                <Select
                  label="Teaching period"
                  placeholder="Any period"
                  items={sessions.map((s) => ({ id: s.id, label: s.label }))}
                >
                  {(item) => (
                    <Select.Item id={item.id}>{item.label}</Select.Item>
                  )}
                </Select>
                <Select
                  label="College"
                  placeholder="Any college"
                  items={colleges.map((c) => ({ id: c.id, label: c.label }))}
                >
                  {(item) => (
                    <Select.Item id={item.id}>{item.label}</Select.Item>
                  )}
                </Select>

                <fieldset className="flex flex-col gap-3">
                  <legend className="pb-1 text-sm font-semibold text-secondary">
                    Availability
                  </legend>
                  <Checkbox label="Prerequisites already met" defaultSelected />
                  <Checkbox label="Places still available" />
                  <Checkbox label="No timetable clash" />
                </fieldset>
              </SlideoutMenu.Content>

              <SlideoutMenu.Footer className="mt-auto flex gap-3 [&>*]:flex-1">
                <Button size="lg" color="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setApplied(new Date().toLocaleTimeString("en-AU"));
                    close();
                  }}
                >
                  Apply filters
                </Button>
              </SlideoutMenu.Footer>
            </>
          )}
        </SlideoutMenu>
      </SlideoutMenu.Trigger>

      <p className="text-tertiary text-sm">
        {applied
          ? `Filters applied at ${applied}.`
          : "Nothing applied. Escape or the backdrop closes the drawer."}
      </p>
    </div>
  );
}

function CourseDetailDrawer() {
  const course = courses[0];

  return (
    <SlideoutMenu.Trigger>
      <Button color="secondary">Open course detail</Button>

      <SlideoutMenu isDismissable>
        {({ close }) => (
          <>
            <SlideoutMenu.Header onClose={close}>
              <p className="text-quaternary font-mono text-xs font-semibold">
                {course.code}
              </p>
              <h2 className="text-lg font-semibold text-primary">
                {course.title}
              </h2>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content className="flex flex-col gap-5">
              <dl className="flex flex-col gap-3">
                {[
                  ["Units", `${course.units}`],
                  ["Teaching period", course.session],
                  ["College", course.college],
                  ["Convener", course.convener],
                  [
                    "Enrolment",
                    `${course.enrolled} of ${course.capacity} places`,
                  ],
                ].map(([term, detail]) => (
                  <div
                    key={term}
                    className="flex justify-between gap-4 border-b border-secondary pb-3 last:border-0"
                  >
                    <dt className="text-tertiary text-sm">{term}</dt>
                    <dd className="text-right text-sm font-medium text-secondary">
                      {detail}
                    </dd>
                  </div>
                ))}
              </dl>

              <TextArea
                label="Note for your adviser"
                rows={4}
                placeholder="Why do you want to take this course?"
              />
            </SlideoutMenu.Content>

            <SlideoutMenu.Footer className="mt-auto flex gap-3 [&>*]:flex-1">
              <Button size="lg" color="secondary" onClick={close}>
                Close
              </Button>
              <Button size="lg" onClick={close}>
                Add to plan
              </Button>
            </SlideoutMenu.Footer>
          </>
        )}
      </SlideoutMenu>
    </SlideoutMenu.Trigger>
  );
}

export function DrawersSection() {
  return (
    <Stack>
      <Example
        title="Filter drawer"
        description="A full form inside a slideout. Focus is trapped, Escape closes, and focus returns to the trigger."
      >
        <FilterDrawer />
      </Example>

      <Example
        title="Detail drawer"
        description="Reading context without leaving the list behind it."
      >
        <Variants>
          <CourseDetailDrawer />
        </Variants>
      </Example>
    </Stack>
  );
}
