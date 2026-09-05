"use client";

import type { FC } from "react";
import {
  Atom01,
  BarChartSquare02,
  Bank,
  BookOpen01,
  Code02,
  CpuChip01,
  Globe02,
  Scales02,
  Speedometer02,
} from "@untitledui/icons";
import { cx } from "@uui/utils/cx";

/**
 * Coursemap composition. A per-course glyph derived from the subject-area
 * prefix of the course code, so a course is recognisable before its title is
 * read. Colours come from Untitled UI's utility ramps, which invert correctly
 * in dark mode.
 */

type Subject = {
  icon: FC<{ className?: string }>;
  /** Utility ramp name. Paired classes below keep them statically analysable. */
  surface: string;
  glyph: string;
  label: string;
};

const fallback: Subject = {
  icon: BookOpen01,
  surface: "bg-utility-neutral-100",
  glyph: "text-utility-neutral-600",
  label: "General",
};

const subjects: Record<string, Subject> = {
  COMP: {
    icon: Code02,
    surface: "bg-utility-brand-100",
    glyph: "text-utility-brand-600",
    label: "Computing",
  },
  MATH: {
    icon: BarChartSquare02,
    surface: "bg-utility-blue-100",
    glyph: "text-utility-blue-600",
    label: "Mathematics",
  },
  STAT: {
    icon: BarChartSquare02,
    surface: "bg-utility-sky-100",
    glyph: "text-utility-sky-600",
    label: "Statistics",
  },
  ENGN: {
    icon: CpuChip01,
    surface: "bg-utility-orange-100",
    glyph: "text-utility-orange-600",
    label: "Engineering",
  },
  PHYS: {
    icon: Atom01,
    surface: "bg-utility-indigo-100",
    glyph: "text-utility-indigo-600",
    label: "Physics",
  },
  ECON: {
    icon: Speedometer02,
    surface: "bg-utility-emerald-100",
    glyph: "text-utility-emerald-600",
    label: "Economics",
  },
  LAWS: {
    icon: Scales02,
    surface: "bg-utility-pink-100",
    glyph: "text-utility-pink-600",
    label: "Law",
  },
  BUSN: {
    icon: Bank,
    surface: "bg-utility-amber-100",
    glyph: "text-utility-amber-600",
    label: "Business",
  },
  INTR: {
    icon: Globe02,
    surface: "bg-utility-purple-100",
    glyph: "text-utility-purple-600",
    label: "International",
  },
};

export function subjectFor(code: string): Subject & { prefix: string } {
  const prefix = code.slice(0, 4).toUpperCase();
  return { ...(subjects[prefix] ?? fallback), prefix };
}

const sizes = {
  sm: { root: "size-8 rounded-md", icon: "size-4", text: "text-[10px]" },
  md: { root: "size-10 rounded-lg", icon: "size-5", text: "text-xs" },
  lg: { root: "size-12 rounded-[10px]", icon: "size-6", text: "text-sm" },
} as const;

export function CourseGlyph({
  code,
  size = "md",
  variant = "icon",
  className,
}: {
  code: string;
  size?: keyof typeof sizes;
  /** `icon` shows the subject glyph; `code` shows the four-letter prefix. */
  variant?: "icon" | "code";
  className?: string;
}) {
  const subject = subjectFor(code);
  const Icon = subject.icon;

  return (
    <span
      aria-hidden="true"
      title={`${subject.label} course`}
      className={cx(
        "flex shrink-0 items-center justify-center",
        subject.surface,
        sizes[size].root,
        className,
      )}
    >
      {variant === "icon" ? (
        <Icon className={cx(sizes[size].icon, subject.glyph)} />
      ) : (
        <span
          className={cx(
            "font-mono font-bold tracking-tight",
            sizes[size].text,
            subject.glyph,
          )}
        >
          {subject.prefix}
        </span>
      )}
    </span>
  );
}
