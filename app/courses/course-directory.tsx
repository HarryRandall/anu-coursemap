import Link from "next/link";
import { CourseToken } from "@/components/ui/course-token";
import {
  DataTableShell,
  tableCellClasses,
  tableClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableRowClasses,
} from "@/components/ui/data-table";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";
import { cn } from "@/lib/cn";
import { CourseRowActions } from "./course-row-actions";

function sessionLabels(sessions: string[]) {
  return sessions
    .map((session) => {
      const number = session.match(/Semester\s+(\d+)/i)?.[1];
      return number ? `Sem ${number}` : session;
    })
    .sort();
}

const chipClasses =
  "rounded-md bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200 ring-inset";

export function CourseDirectory({ courses }: { courses: CatalogueCourse[] }) {
  return (
    <DataTableShell
      footer={
        <p className="text-xs text-zinc-500">
          {`Viewing ${courses.length.toLocaleString("en-AU")} ${
            courses.length === 1 ? "course" : "courses"
          }`}
        </p>
      }
    >
      <table className={tableClasses("table-fixed")}>
        <colgroup>
          <col />
          <col className="w-[11rem]" />
          <col className="w-[12rem]" />
          <col className="w-[9rem]" />
          <col className="w-[4rem]" />
        </colgroup>
        <thead className={tableHeadClasses()}>
          <tr>
            <th className={tableHeaderCellClasses()}>Course</th>
            <th className={tableHeaderCellClasses()}>Subject</th>
            <th className={tableHeaderCellClasses()}>Requisites</th>
            <th className={tableHeaderCellClasses()}>Available</th>
            <th className={tableHeaderCellClasses()}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr className={tableRowClasses()}>
              <td
                colSpan={5}
                className={tableCellClasses(
                  "py-12 text-center font-normal whitespace-normal text-zinc-500",
                )}
              >
                No courses match the current filters.
              </td>
            </tr>
          ) : null}
          {courses.map((course) => {
            const href = `/courses/${course.code}`;
            return (
              <tr
                key={course.code}
                className={tableRowClasses("group hover:bg-zinc-50/60")}
              >
                <td className={tableCellClasses("p-0")}>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Link
                      href={href}
                      className="shrink-0 rounded-[4px] focus-visible:ring-2 focus-visible:ring-brand-400"
                      aria-label={`View ${course.code}`}
                    >
                      <CourseToken
                        code={course.code}
                        accent={course.accent}
                        size="sm"
                        shape="square"
                        className="ring-1 ring-black/5 ring-inset"
                      />
                    </Link>
                    <span className="min-w-0 flex-1">
                      <Link
                        href={href}
                        className="block truncate text-[13px] font-medium text-zinc-900 hover:text-brand-700 focus:text-brand-700 focus:outline-none"
                      >
                        {course.name}
                      </Link>
                      <Link
                        href={href}
                        className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500 hover:text-zinc-700 focus:text-zinc-700 focus:outline-none"
                      >
                        {course.code}
                        {course.publicationStatus === "draft"
                          ? " · Review needed"
                          : ""}
                      </Link>
                    </span>
                  </div>
                </td>
                <td className={tableCellClasses("p-0")}>
                  <Link
                    href={href}
                    className="flex min-h-12 flex-col justify-center px-4 py-2.5 focus:outline-none"
                  >
                    <span className="truncate text-[13px] text-zinc-700">
                      {course.subject}
                    </span>
                    <span className="mt-0.5 truncate text-[11px] text-zinc-500">
                      Level {course.level / 1000}
                    </span>
                  </Link>
                </td>
                <td className={tableCellClasses("p-0")}>
                  <div className="flex min-h-12 flex-wrap items-center gap-1 px-4 py-2.5">
                    {course.prerequisiteCodes.length === 0 ? (
                      <span className="text-[13px] text-zinc-400">None</span>
                    ) : (
                      course.prerequisiteCodes.map((prerequisite) => (
                        <Link
                          key={prerequisite}
                          href={`/courses/${prerequisite}`}
                          aria-label={`View prerequisite ${prerequisite}`}
                          className={cn(
                            chipClasses,
                            "font-mono transition-colors hover:bg-white hover:text-brand-700 hover:ring-brand-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-400 motion-reduce:transition-none",
                          )}
                        >
                          {prerequisite}
                        </Link>
                      ))
                    )}
                  </div>
                </td>
                <td className={tableCellClasses("p-0")}>
                  <Link
                    href={href}
                    className="flex min-h-12 flex-wrap items-center gap-1 px-4 py-2.5 focus:outline-none"
                  >
                    {course.sessions.length === 0 ? (
                      <span className="text-[13px] text-zinc-400">
                        Not listed
                      </span>
                    ) : (
                      sessionLabels(course.sessions).map((label) => (
                        <span key={label} className={chipClasses}>
                          {label}
                        </span>
                      ))
                    )}
                  </Link>
                </td>
                <td className={tableCellClasses("p-0")}>
                  <div className="flex min-h-12 items-center justify-end pr-3">
                    <CourseRowActions
                      course={{
                        code: course.code,
                        name: course.name,
                        sessions: course.sessions,
                        sourceUrl: course.sourceUrl,
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableShell>
  );
}
