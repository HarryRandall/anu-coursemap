"use client";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Hint } from "@/ui/common/hint";
import type { CourseDetails } from "@/lib/coursemap/course-types";

export function CourseReferenceText({
  academicYear,
  text,
  availableCourseCodes,
}: {
  academicYear: number;
  text: string;
  availableCourseCodes: ReadonlySet<string>;
}) {
  return text.split(/([A-Z]{4}\d{4}[A-Z]?)/gu).map((part, index) => {
    if (!/^[A-Z]{4}\d{4}[A-Z]?$/u.test(part)) {
      return <span key={index}>{part}</span>;
    }
    if (availableCourseCodes.has(part)) {
      return (
        <Link
          key={index}
          href={`/courses/${part}?year=${academicYear}`}
          prefetch={false}
          className="rounded font-mono font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary"
        >
          {part}
        </Link>
      );
    }
    return (
      <Hint key={index} label={`${part}: course details unavailable`}>
        <span className="inline-flex items-center gap-1 rounded bg-muted px-1 font-mono font-semibold text-muted-foreground">
          <LockKeyhole size={10} aria-hidden="true" />
          {part}
          <span className="sr-only">Course details unavailable</span>
        </span>
      </Hint>
    );
  });
}
export function CourseReferenceChips({
  academicYear,
  course,
  availableCourseCodes,
}: {
  academicYear: number;
  course: CourseDetails;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (course.prerequisiteCodes.length === 0) return null;
  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Detected course references
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {course.prerequisiteCodes.map((reference) =>
          availableCourseCodes.has(reference) ? (
            <Link
              key={reference}
              href={`/courses/${reference}?year=${academicYear}`}
              prefetch={false}
              className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/15"
            >
              {reference}
            </Link>
          ) : (
            <Hint
              key={reference}
              label={`${reference}: course details unavailable`}
            >
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold text-muted-foreground ring-1 ring-border">
                <LockKeyhole size={11} aria-hidden="true" />
                {reference}
                <span className="sr-only">Course details unavailable</span>
              </span>
            </Hint>
          ),
        )}
      </div>
    </div>
  );
}
