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
import type { Course } from "@/lib/catalogue";

function formatAvailability(sessions: string[]) {
  return sessions.length > 0 ? sessions.join(" · ") : "Availability not listed";
}

export function CourseDirectory({ courses }: { courses: Course[] }) {
  return (
    <DataTableShell
      footer={
        <p className="text-xs text-zinc-500">
          Viewing {courses.length.toLocaleString("en-AU")}{" "}
          {courses.length === 1 ? "course" : "courses"}
        </p>
      }
    >
      <table className={tableClasses("table-fixed")}>
        <colgroup>
          <col className="w-[62%]" />
          <col className="w-[38%]" />
        </colgroup>
        <thead className={tableHeadClasses()}>
          <tr>
            <th className={tableHeaderCellClasses()}>Course</th>
            <th className={tableHeaderCellClasses()}>Available</th>
          </tr>
        </thead>
        <tbody>
          {courses.length === 0 ? (
            <tr className={tableRowClasses()}>
              <td
                colSpan={2}
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
            const availability = formatAvailability(course.sessions);
            return (
              <tr
                key={course.code}
                className={tableRowClasses("group hover:bg-zinc-50/60")}
              >
                <td className={tableCellClasses("p-0")}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <Link
                      href={href}
                      className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-400"
                      aria-label={`View ${course.code}`}
                    >
                      <CourseToken
                        code={course.code}
                        accent={course.accent}
                        size="sm"
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
                      </Link>
                    </span>
                  </div>
                </td>
                <td className={tableCellClasses("p-0")}>
                  <Link
                    href={href}
                    className="flex min-h-12 items-center px-4 py-2.5 text-[13px] text-zinc-700"
                  >
                    {availability}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableShell>
  );
}
