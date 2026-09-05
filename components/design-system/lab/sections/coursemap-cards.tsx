"use client";

import { useState } from "react";
import { Alert } from "@/components/design-system/coursemap/alert";
import {
  CourseCard,
  ProgrammeCard,
  RequirementCard,
} from "@/components/design-system/coursemap/cards";
import { Breadcrumbs } from "@/components/design-system/coursemap/breadcrumbs";
import { MetricProgressCard } from "@/components/design-system/coursemap/metric-card";
import { Button } from "@uui/components/base/buttons/button";
import { courses, programmes, requirements } from "../content";
import { Example, Grid, Stack } from "../section-frame";

function SelectableCourseGrid() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["comp2100"]),
  );
  const [log, setLog] = useState<string | null>(null);

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const codes = courses
    .filter((course) => selected.has(course.id))
    .map((course) => course.code);

  return (
    <div className="flex flex-col gap-4">
      <Grid cols={3}>
        {courses.slice(0, 6).map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={selected.has(course.id)}
            onSelectedChange={(on) => toggle(course.id, on)}
            onAction={(key) => setLog(`${course.code}: ${key}`)}
          />
        ))}
      </Grid>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-tertiary text-sm">
          {log ??
            (codes.length > 0
              ? `${codes.join(", ")} selected. Open a card menu to run an action.`
              : "Nothing selected. Tick a card to select it.")}
        </p>
        {selected.size > 0 && (
          <Button
            size="sm"
            color="link-gray"
            onClick={() => {
              setSelected(new Set());
              setLog(null);
            }}
          >
            Clear selection
          </Button>
        )}
      </div>
    </div>
  );
}

export function CoursemapCardsSection() {
  return (
    <Stack>
      <Example
        title="Course cards"
        bare
        description="Built entirely from vendored Checkbox, Badge, Avatar, Button, Dropdown and Tooltip primitives. Tick a card to select it; the locked card explains itself on hover."
      >
        <SelectableCourseGrid />
      </Example>

      <Example
        title="Programme cards"
        bare
        description="Progress towards a whole degree, including a not-started state."
      >
        <Grid cols={3}>
          {programmes.map((programme) => (
            <ProgrammeCard key={programme.id} {...programme} />
          ))}
        </Grid>
      </Example>

      <Example
        title="Requirement cards"
        bare
        description="Met, in progress and not started, each with the courses that count."
      >
        <Grid cols={2}>
          {requirements.map((requirement) => (
            <RequirementCard key={requirement.id} {...requirement} />
          ))}
        </Grid>
      </Example>

      <Example
        title="A composed page"
        bare
        description="Breadcrumbs, an alert, a metric and cards, as a real Coursemap screen would assemble them."
      >
        <div className="flex flex-col gap-6 rounded-xl bg-primary p-6 ring-1 ring-secondary">
          <Breadcrumbs
            items={[
              { id: "plan", label: "Plan", href: "#" },
              { id: "2026", label: "2026", href: "#" },
              { id: "s1", label: "Semester 1" },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-display-xs font-semibold text-primary">
                Semester 1, 2026
              </h2>
              <p className="text-md text-tertiary">
                24 units planned across four courses.
              </p>
            </div>
            <Button color="secondary">Add a course</Button>
          </div>

          <Alert intent="warning" title="Census date is in 6 days">
            Courses dropped after 31 March 2026 stay on your transcript.
          </Alert>

          <Grid cols={3}>
            <MetricProgressCard
              label="Units this semester"
              completed={24}
              total={24}
              caption="A standard full-time load."
            />
            <MetricProgressCard
              label="Degree progress"
              completed={96}
              total={192}
            />
            <MetricProgressCard
              label="Compulsory courses"
              completed={36}
              total={48}
            />
          </Grid>

          <Grid cols={2}>
            {courses.slice(0, 2).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </Grid>
        </div>
      </Example>
    </Stack>
  );
}
