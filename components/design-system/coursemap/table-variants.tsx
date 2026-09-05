"use client";

import { Fragment } from "react";
import type { Selection, SortDescriptor } from "react-aria-components";
import {
  Table,
  TableCard,
  TableRowActionsDropdown,
} from "@uui/components/application/table/table";
import { Badge, BadgeWithDot } from "@uui/components/base/badges/badges";
import { Button } from "@uui/components/base/buttons/button";
import { ButtonUtility } from "@uui/components/base/buttons/button-utility";
import { Checkbox } from "@uui/components/base/checkbox/checkbox";
import { ProgressBarBase } from "@uui/components/base/progress-indicators/progress-indicators";
import { cx } from "@uui/utils/cx";
import { ArrowRight } from "@untitledui/icons";
import type { Course, CourseStatus } from "../lab/content";
import { statusLabels } from "../lab/content";
import { CourseGlyph } from "./course-glyph";

/**
 * Five table anatomies over the same data and the same interaction contract, so
 * the choice can be made on appearance rather than on capability. Every variant
 * uses the vendored MIT table or the same semantic tokens.
 */

export const tableVariantIds = [
  "card",
  "flush",
  "zebra",
  "rich",
  "grouped",
] as const;

export type TableVariantId = (typeof tableVariantIds)[number];

export const tableVariantLabels: Record<
  TableVariantId,
  { title: string; summary: string }
> = {
  card: {
    title: "Card",
    summary:
      "The Untitled default. A titled card with a filter row, badges and a footer. Best for the primary catalogue.",
  },
  flush: {
    title: "Flush",
    summary:
      "No card chrome, rules only. Sits directly on the page ground, so it reads as part of the layout rather than a widget.",
  },
  zebra: {
    title: "Zebra compact",
    summary:
      "The sm size with striped rows and more columns. Built for administrative scanning.",
  },
  rich: {
    title: "Rich rows",
    summary:
      "Each row leads with the subject glyph and stacks code over title, with progress and meta on the right.",
  },
  grouped: {
    title: "Grouped by period",
    summary:
      "Rows collected under sticky teaching-period headers, for a plan read chronologically.",
  },
};

export const statusColor: Record<
  CourseStatus,
  "success" | "brand" | "blue" | "gray"
> = {
  completed: "success",
  enrolled: "brand",
  planned: "blue",
  locked: "gray",
};

type VariantProps = {
  rows: Course[];
  selected: Selection;
  onSelectionChange: (keys: Selection) => void;
  sort: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
};

function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <BadgeWithDot size="sm" type="pill-color" color={statusColor[status]}>
      {statusLabels[status]}
    </BadgeWithDot>
  );
}

/** Shared column set for the variants that use the vendored Table. */
function CourseTableBody({ rows }: { rows: Course[] }) {
  return (
    <Table.Body items={rows}>
      {(course) => (
        <Table.Row id={course.id}>
          <Table.Cell className="font-mono text-sm text-primary">
            {course.code}
          </Table.Cell>
          <Table.Cell>{course.title}</Table.Cell>
          <Table.Cell>{course.units}</Table.Cell>
          <Table.Cell>{course.session}</Table.Cell>
          <Table.Cell>
            <StatusBadge status={course.status} />
          </Table.Cell>
          <Table.Cell className="px-4">
            <TableRowActionsDropdown />
          </Table.Cell>
        </Table.Row>
      )}
    </Table.Body>
  );
}

function CourseTableHeader() {
  return (
    <Table.Header>
      <Table.Head id="code" label="Code" isRowHeader allowsSorting />
      <Table.Head id="title" label="Title" allowsSorting />
      <Table.Head id="units" label="Units" allowsSorting />
      <Table.Head id="session" label="Teaching period" allowsSorting />
      <Table.Head id="status" label="Status" allowsSorting />
      <Table.Head id="actions" />
    </Table.Header>
  );
}

export function FlushTable({
  rows,
  selected,
  onSelectionChange,
  sort,
  onSortChange,
}: VariantProps) {
  return (
    <div className="-mx-4 md:-mx-6">
      <Table
        aria-label="Course catalogue, flush"
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sort}
        onSortChange={onSortChange}
      >
        <CourseTableHeader />
        <CourseTableBody rows={rows} />
      </Table>
    </div>
  );
}

export function ZebraTable({
  rows,
  selected,
  onSelectionChange,
  sort,
  onSortChange,
}: VariantProps) {
  return (
    <TableCard.Root size="sm">
      <Table
        size="sm"
        aria-label="Course catalogue, compact"
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sort}
        onSortChange={onSortChange}
        className="[&_tbody_tr:nth-child(odd)]:bg-secondary_alt"
      >
        <Table.Header>
          <Table.Head id="code" label="Code" isRowHeader allowsSorting />
          <Table.Head id="title" label="Title" allowsSorting />
          <Table.Head id="units" label="Units" allowsSorting />
          <Table.Head id="session" label="Period" allowsSorting />
          <Table.Head id="college" label="College" allowsSorting />
          <Table.Head id="convener" label="Convener" />
          <Table.Head id="enrolled" label="Enrolled" />
          <Table.Head id="status" label="Status" allowsSorting />
        </Table.Header>
        <Table.Body items={rows}>
          {(course) => (
            <Table.Row id={course.id}>
              <Table.Cell className="font-mono text-sm text-primary">
                {course.code}
              </Table.Cell>
              <Table.Cell>{course.title}</Table.Cell>
              <Table.Cell>{course.units}</Table.Cell>
              <Table.Cell>{course.session}</Table.Cell>
              <Table.Cell>{course.college}</Table.Cell>
              <Table.Cell>{course.convener}</Table.Cell>
              <Table.Cell>
                {course.enrolled}/{course.capacity}
              </Table.Cell>
              <Table.Cell>
                <StatusBadge status={course.status} />
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </TableCard.Root>
  );
}

/**
 * A list rather than a grid. Not the vendored Table, because the row is a
 * two-dimensional card, but built from the same primitives and tokens.
 */
export function RichRowsTable({
  rows,
  selected,
  onSelectionChange,
}: VariantProps) {
  const selectedSet =
    selected === "all"
      ? new Set(rows.map((row) => row.id))
      : (selected as Set<string>);

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selectedSet);
    if (on) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  return (
    <ul className="flex flex-col divide-y divide-secondary rounded-xl bg-primary ring-1 ring-secondary">
      {rows.map((course) => (
        <li
          key={course.id}
          className={cx(
            "hover:bg-primary_hover flex flex-wrap items-center gap-4 px-4 py-4 transition duration-100 ease-linear first:rounded-t-xl last:rounded-b-xl md:px-6",
            selectedSet.has(course.id) && "bg-brand-primary_alt",
          )}
        >
          <Checkbox
            size="md"
            aria-label={`Select ${course.code}`}
            isSelected={selectedSet.has(course.id)}
            onChange={(on) => toggle(course.id, on)}
          />

          <CourseGlyph code={course.code} size="lg" />

          <div className="flex min-w-50 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-sm font-semibold text-primary">
                {course.code}
              </span>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-sm text-secondary">{course.title}</p>
            <p className="text-quaternary text-xs">
              {course.session} &middot; {course.convener}
            </p>
          </div>

          <div className="flex w-40 flex-col gap-1.5 max-sm:w-full">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-tertiary text-xs">Enrolment</span>
              <span className="text-quaternary font-mono text-xs">
                {course.enrolled}/{course.capacity}
              </span>
            </div>
            <ProgressBarBase
              value={
                course.capacity === 0
                  ? 0
                  : (course.enrolled / course.capacity) * 100
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge size="sm" type="modern">
              {course.units} units
            </Badge>
            <ButtonUtility
              size="sm"
              color="tertiary"
              icon={ArrowRight}
              tooltip={`Open ${course.code}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GroupedTable({
  rows,
  selected,
  onSelectionChange,
}: VariantProps) {
  const selectedSet =
    selected === "all"
      ? new Set(rows.map((row) => row.id))
      : (selected as Set<string>);

  const groups = rows.reduce<Record<string, Course[]>>((acc, course) => {
    (acc[course.session] ||= []).push(course);
    return acc;
  }, {});

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selectedSet);
    if (on) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
      <table className="w-full">
        <caption className="sr-only">
          Courses grouped by teaching period
        </caption>
        <tbody>
          {Object.entries(groups).map(([session, group]) => (
            <Fragment key={session}>
              <tr>
                <th
                  colSpan={5}
                  scope="colgroup"
                  className="text-tertiary sticky top-0 z-10 border-y border-secondary bg-secondary px-4 py-2.5 text-left text-xs font-semibold tracking-wide uppercase md:px-6"
                >
                  <span className="flex items-center gap-2">
                    {session}
                    <Badge size="sm" type="modern">
                      {group.reduce((sum, course) => sum + course.units, 0)}{" "}
                      units
                    </Badge>
                  </span>
                </th>
              </tr>
              {group.map((course) => (
                <tr
                  key={course.id}
                  className="hover:bg-primary_hover border-b border-secondary transition duration-100 ease-linear last:border-0"
                >
                  <td className="w-10 py-3 pl-4 md:pl-6">
                    <Checkbox
                      size="md"
                      aria-label={`Select ${course.code}`}
                      isSelected={selectedSet.has(course.id)}
                      onChange={(on) => toggle(course.id, on)}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-3">
                      <CourseGlyph code={course.code} size="sm" />
                      <span className="font-mono text-sm text-primary">
                        {course.code}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-secondary">
                    {course.title}
                  </td>
                  <td className="text-tertiary py-3 pr-4 text-sm max-sm:hidden">
                    {course.units} units
                  </td>
                  <td className="py-3 pr-4 md:pr-6">
                    <StatusBadge status={course.status} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardTable({
  rows,
  selected,
  onSelectionChange,
  sort,
  onSortChange,
  header,
}: VariantProps & { header?: React.ReactNode }) {
  return (
    <TableCard.Root>
      {header}
      <Table
        aria-label="Course catalogue"
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sort}
        onSortChange={onSortChange}
      >
        <CourseTableHeader />
        <CourseTableBody rows={rows} />
      </Table>
    </TableCard.Root>
  );
}

export { Button };
