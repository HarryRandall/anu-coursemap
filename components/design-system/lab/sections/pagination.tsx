"use client";

import { useState } from "react";
import {
  PaginationCardDefault,
  PaginationCardMinimal,
  PaginationPageDefault,
} from "@uui/components/application/pagination/pagination";
import { PaginationDot } from "@uui/components/application/pagination/pagination-dot";
import { courses } from "../content";
import { Example, Stack } from "../section-frame";

const PAGE_SIZE = 3;

function PaginatedCourses() {
  const [page, setPage] = useState(1);
  const pages = Math.ceil(courses.length / PAGE_SIZE);
  const visible = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-secondary rounded-lg ring-1 ring-secondary">
        {visible.map((course) => (
          <li
            key={course.id}
            className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
          >
            <span className="text-sm font-medium text-secondary">
              <span className="font-mono text-xs text-quaternary">
                {course.code}
              </span>{" "}
              {course.title}
            </span>
            <span className="text-sm text-tertiary">{course.session}</span>
          </li>
        ))}
      </ul>

      <PaginationPageDefault page={page} total={pages} onPageChange={setPage} />

      <p className="text-sm text-tertiary">
        Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
        {Math.min(page * PAGE_SIZE, courses.length)} of {courses.length}{" "}
        courses.
      </p>
    </div>
  );
}

function MinimalFooter() {
  const [page, setPage] = useState(2);
  return (
    <PaginationCardMinimal
      page={page}
      total={10}
      onPageChange={setPage}
      className="border-t-0"
    />
  );
}

function CardFooter() {
  const [page, setPage] = useState(3);
  return (
    <PaginationCardDefault page={page} total={10} onPageChange={setPage} />
  );
}

function Dots() {
  const [page, setPage] = useState(1);
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <PaginationDot
        isBrand
        size="lg"
        page={page}
        total={5}
        onPageChange={setPage}
      />
      <p className="text-sm text-tertiary">Step {page} of 5.</p>
    </div>
  );
}

export function PaginationSection() {
  return (
    <Stack>
      <Example
        title="Page numbers driving a list"
        description="The list above the control is really paged. Previous is disabled on the first page and Next on the last."
      >
        <PaginatedCourses />
      </Example>

      <Example
        title="Minimal card footer"
        description="For a table or card grid footer. Previous and Next both work."
        className="rounded-xl bg-primary ring-1 ring-secondary"
      >
        <MinimalFooter />
      </Example>

      <Example
        title="Advanced card footer"
        description="Page numbers inside a card footer."
        className="rounded-xl bg-primary ring-1 ring-secondary"
      >
        <CardFooter />
      </Example>

      <Example
        title="Dots"
        description="For short, swipeable sequences such as onboarding. Click a dot or tab to it and press Enter."
      >
        <Dots />
      </Example>
    </Stack>
  );
}
