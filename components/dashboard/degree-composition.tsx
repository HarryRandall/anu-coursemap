"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@reui/ui/card";
import styles from "./composition-block.module.css";

type PreviewCourse = {
  code: string;
  name: string;
  status: "Completed" | "Planned";
};
const sections = [
  {
    name: "Major",
    units: 72,
    colour: "bg-violet-300",
    grid: "grid-cols-3 grid-rows-4",
    courses: [
      {
        code: "COMP1100",
        name: "Programming as Problem Solving",
        status: "Completed",
      },
      { code: "COMP1110", name: "Structured Programming", status: "Completed" },
      {
        code: "COMP1600",
        name: "Foundations of Computing",
        status: "Completed",
      },
      {
        code: "COMP2100",
        name: "Software Design Methodologies",
        status: "Completed",
      },
      {
        code: "COMP2300",
        name: "Computer Organisation and Program Execution",
        status: "Planned",
      },
      { code: "COMP3600", name: "Algorithms", status: "Planned" },
    ],
  },
  {
    name: "Core",
    units: 36,
    colour: "bg-blue-300",
    grid: "grid-cols-2 grid-rows-3",
    courses: [
      {
        code: "MATH1005",
        name: "Discrete Mathematical Models",
        status: "Completed",
      },
      {
        code: "MATH1013",
        name: "Mathematics and Applications 1",
        status: "Planned",
      },
    ],
  },
  {
    name: "Electives",
    units: 24,
    colour: "bg-emerald-300",
    grid: "grid-cols-2 grid-rows-2",
    courses: [
      {
        code: "FINM3008",
        name: "Applied Portfolio Construction",
        status: "Planned",
      },
    ],
  },
  {
    name: "Breadth",
    units: 12,
    colour: "bg-amber-300",
    grid: "grid-cols-2 grid-rows-1",
    courses: [],
  },
] satisfies {
  name: string;
  units: number;
  colour: string;
  grid: string;
  courses: PreviewCourse[];
}[];

function CompositionBlock({
  section,
  courseLinks,
  className = "",
}: {
  section: (typeof sections)[number];
  courseLinks: Record<string, string>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`${styles.block} ${section.colour} ${className} relative min-h-0 min-w-0 overflow-hidden rounded-lg`}
      data-open={open}
      data-category={section.name}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => setOpen(false)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.currentTarget.querySelector("button")?.focus();
        }
      }}
    >
      <button
        type="button"
        className={`${styles.trigger} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`}
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
        aria-label={`${section.name}, ${section.units} units, ${section.units / 6} course slots`}
        onClick={(event) => setOpen(event.detail > 0 ? true : !open)}
      >
        <span className={styles.heading}>
          <strong>{section.name}</strong>
          <span className={styles.units}>{section.units} units</span>
        </span>
      </button>
      <div inert={!open} className={`${styles.slots} ${section.grid}`}>
        {Array.from({ length: section.units / 6 }, (_, index) => {
          const course = section.courses[index];
          return (
            <Link
              key={index}
              href={
                course
                  ? (courseLinks[course.code] ?? `/courses?q=${course.code}`)
                  : "/courses?year=2026"
              }
              className={`${styles.slot} text-[10px] focus-visible:outline-2 focus-visible:outline-ring`}
              data-status={course?.status ?? "Unallocated"}
              aria-label={
                course
                  ? `View ${course.code} ${course.name} · ${course.status} · 6 units`
                  : `Add a course to ${section.name}, slot ${index + 1}, 6 units`
              }
            >
              {course ? (
                <span>
                  {course.code.replace(/\d/g, "")}
                  <wbr />
                  {course.code.replace(/\D/g, "")}
                </span>
              ) : (
                <>
                  <span className={styles.emptyLabel}>6 units</span>
                  <Plus
                    size={16}
                    className={styles.addIcon}
                    aria-hidden="true"
                  />
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DegreeComposition({
  courseLinks,
}: {
  courseLinks: Record<string, string>;
}) {
  return (
    <Card className="h-full py-0">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Degree composition</h2>
          <p className="text-sm font-medium tabular-nums">144 units</p>
        </div>
        <div
          className="grid min-h-52 flex-1 grid-cols-4 gap-1.5"
          aria-label="Sample degree composition"
        >
          <CompositionBlock
            section={sections[0]}
            courseLinks={courseLinks}
            className="col-span-2"
          />
          <CompositionBlock section={sections[1]} courseLinks={courseLinks} />
          <div className="grid min-w-0 grid-rows-[2fr_1fr] gap-1.5">
            {sections.slice(2).map((section) => (
              <CompositionBlock
                key={section.name}
                section={section}
                courseLinks={courseLinks}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {[
            ["Completed", "bg-emerald-500"],
            ["Planned", "bg-violet-500"],
            ["Unallocated", "bg-muted-foreground/40"],
          ].map(([label, colour]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-sm ${colour}`} />
              {label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
