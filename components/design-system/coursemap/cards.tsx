"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  DotsVertical,
  Lock01,
  Users01,
} from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { Avatar } from "@uui/components/base/avatar/avatar";
import { Badge, BadgeWithIcon } from "@uui/components/base/badges/badges";
import { Button } from "@uui/components/base/buttons/button";
import { Checkbox } from "@uui/components/base/checkbox/checkbox";
import { Dropdown } from "@uui/components/base/dropdown/dropdown";
import { ProgressBarBase } from "@uui/components/base/progress-indicators/progress-indicators";
import { Tooltip, TooltipTrigger } from "@uui/components/base/tooltip/tooltip";
import { cx } from "@uui/utils/cx";
import { CourseGlyph } from "./course-glyph";
import type { Course, CourseStatus } from "../lab/content";

/**
 * Coursemap compositions. Every element comes from a vendored MIT primitive;
 * only the arrangement and the domain logic are ours.
 */

const statusMeta: Record<
  CourseStatus,
  {
    label: string;
    color: "success" | "brand" | "blue" | "gray";
    icon: typeof CheckCircle;
  }
> = {
  completed: { label: "Completed", color: "success", icon: CheckCircle },
  enrolled: { label: "Enrolled", color: "brand", icon: Clock },
  planned: { label: "Planned", color: "blue", icon: Clock },
  locked: { label: "Prerequisites unmet", color: "gray", icon: Lock01 },
};

const cardShell =
  "flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-secondary transition duration-100 ease-linear";

export function CourseCard({
  course,
  onAction,
  selected = false,
  onSelectedChange,
}: {
  course: Course;
  onAction?: (key: string) => void;
  selected?: boolean;
  /** When provided, the card carries a selection checkbox. */
  onSelectedChange?: (selected: boolean) => void;
}) {
  const meta = statusMeta[course.status];
  const locked = course.status === "locked";

  return (
    <article
      className={cx(
        cardShell,
        "hover:ring-brand",
        selected && "ring-brand ring-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {onSelectedChange && (
            <Checkbox
              size="md"
              className="mt-2.5"
              aria-label={`Select ${course.code}`}
              isSelected={selected}
              onChange={onSelectedChange}
            />
          )}
          <CourseGlyph code={course.code} size="md" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-quaternary font-mono text-xs font-semibold">
              {course.code}
            </p>
            <h3 className="text-md font-semibold text-primary">
              {course.title}
            </h3>
          </div>
        </div>

        {onAction && (
          <Dropdown.Root>
            <AriaButton
              aria-label={`Actions for ${course.code}`}
              className="text-fg-quaternary outline-focus-ring hover:bg-primary_hover hover:text-fg-quaternary_hover shrink-0 cursor-pointer rounded-md p-1 transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <DotsVertical className="size-5" />
            </AriaButton>
            <Dropdown.Popover className="w-min">
              <Dropdown.Menu onAction={(key) => onAction(String(key))}>
                <Dropdown.Item id="add">
                  <span className="whitespace-nowrap">Add to plan</span>
                </Dropdown.Item>
                <Dropdown.Item id="handbook">
                  <span className="whitespace-nowrap">Open handbook entry</span>
                </Dropdown.Item>
                <Dropdown.Item id="prerequisites">
                  <span className="whitespace-nowrap">
                    Show prerequisite path
                  </span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BadgeWithIcon
          size="sm"
          type="pill-color"
          color={meta.color}
          iconLeading={meta.icon}
        >
          {meta.label}
        </BadgeWithIcon>
        <Badge size="sm" type="modern">
          {course.units} units
        </Badge>
        <Badge size="sm" type="modern">
          {course.session}
        </Badge>
      </div>

      {course.prerequisites.length > 0 && (
        <p className="text-tertiary text-sm">
          Requires{" "}
          <span className="font-mono text-secondary">
            {course.prerequisites.join(", ")}
          </span>
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-secondary pt-4">
        <div className="flex items-center gap-2">
          <Avatar
            size="xs"
            initials={course.convener
              .split(" ")
              .slice(-2)
              .map((part) => part[0])
              .join("")}
            alt={course.convener}
          />
          <span className="text-tertiary text-sm">{course.convener}</span>
        </div>

        {locked ? (
          <Tooltip
            title="Prerequisites unmet"
            description={`Complete ${course.prerequisites.join(" and ")} first.`}
          >
            <TooltipTrigger>
              <span className="text-quaternary flex items-center gap-1.5 text-sm font-semibold">
                <Lock01 className="size-4" />
                Locked
              </span>
            </TooltipTrigger>
          </Tooltip>
        ) : (
          <Button size="sm" color="secondary">
            Add to plan
          </Button>
        )}
      </div>
    </article>
  );
}

export function ProgrammeCard({
  code,
  title,
  units,
  completed,
  years,
  onAction,
}: {
  code: string;
  title: string;
  units: number;
  completed: number;
  years: number;
  onAction?: (key: string) => void;
}) {
  const percentage = units === 0 ? 0 : (completed / units) * 100;

  return (
    <article className={cardShell}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-quaternary font-mono text-xs font-semibold">
            {code}
          </p>
          <h3 className="text-md font-semibold text-primary">{title}</h3>
        </div>
        <Badge size="sm" type="pill-color" color="brand">
          {years} years
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-tertiary text-sm">Progress</span>
          <span className="text-quaternary font-mono text-xs">
            {completed} / {units} units
          </span>
        </div>
        <ProgressBarBase value={percentage} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-secondary pt-4">
        <span className="text-tertiary flex items-center gap-1.5 text-sm">
          <Users01 className="text-fg-quaternary size-4" />
          {completed === 0 ? "Not started" : `${Math.round(percentage)}% done`}
        </span>
        <Button size="sm" color="link-color" onClick={() => onAction?.("open")}>
          Open plan
        </Button>
      </div>
    </article>
  );
}

export function RequirementCard({
  title,
  detail,
  required,
  completed,
  courses,
}: {
  title: string;
  detail: string;
  required: number;
  completed: number;
  courses: string[];
}) {
  const percentage = required === 0 ? 0 : (completed / required) * 100;
  const met = completed >= required;
  const started = completed > 0;

  return (
    <article className={cardShell}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-md font-semibold text-primary">{title}</h3>
          <p className="text-tertiary text-sm">{detail}</p>
        </div>
        <BadgeWithIcon
          size="sm"
          type="pill-color"
          color={met ? "success" : started ? "warning" : "gray"}
          iconLeading={met ? CheckCircle : AlertCircle}
        >
          {met ? "Met" : started ? "In progress" : "Not started"}
        </BadgeWithIcon>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-tertiary text-sm">
            {completed} of {required} units
          </span>
          <span className="text-quaternary font-mono text-xs">
            {Math.round(percentage)}%
          </span>
        </div>
        <ProgressBarBase value={percentage} />
      </div>

      {courses.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-secondary pt-4">
          {courses.map((code) => (
            <Badge key={code} size="sm" type="modern">
              {code}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-tertiary border-t border-secondary pt-4 text-sm">
          No courses counted towards this requirement yet.
        </p>
      )}
    </article>
  );
}
