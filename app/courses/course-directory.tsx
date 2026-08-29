import Link from "next/link";
import { CourseToken } from "@/components/ui/course-token";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { cn } from "@/lib/cn";
import { Pagination } from "@/components/ui/pagination";
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

export function CourseDirectory({
  academicYear,
  courses,
  page,
  pageSize,
  total,
  filtered = false,
  searchParams,
}: {
  academicYear: number;
  courses: CourseDetails[];
  page: number;
  pageSize: number;
  total: number;
  filtered?: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <DataTableShell
      footer={
        <Pagination
          pathname="/courses"
          searchParams={searchParams}
          page={page}
          pageSize={pageSize}
          total={total}
          itemName="courses"
        />
      }
    >
      <Table className="min-w-[680px] table-fixed">
        <TableCaption>Published ANU courses</TableCaption>
        <colgroup>
          <col />
          <col className="w-[11rem]" />
          <col className="w-[12rem]" />
          <col className="w-[9rem]" />
          <col className="w-[4rem]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Course</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Requisites</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <DataTableEmpty
                  title={
                    filtered ? "No matching courses" : "No published courses"
                  }
                  description={
                    filtered
                      ? "Try a different search or clear one of the filters."
                      : "Published courses will appear here when the catalogue is ready."
                  }
                />
              </TableCell>
            </TableRow>
          ) : null}
          {courses.map((course) => {
            const href = `/courses/${course.code}?year=${academicYear}`;
            return (
              <TableRow key={course.code} className="group">
                <TableCell className="p-0">
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-sm px-4 py-3 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span className="shrink-0">
                      <CourseToken
                        code={course.code}
                        accent={course.accent}
                        size="sm"
                        shape="square"
                        className="ring-1 ring-black/5 ring-inset"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-950 group-hover:text-brand-700">
                        {course.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">
                        {course.code}
                        {course.publicationStatus === "draft"
                          ? " · Review needed"
                          : ""}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex min-h-10 flex-col justify-center">
                    <span className="truncate text-[13px] text-zinc-700">
                      {course.subject}
                    </span>
                    <span className="mt-0.5 truncate text-[11px] text-zinc-500">
                      Level {course.level / 1000}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex min-h-10 flex-wrap items-center gap-1">
                    {course.prerequisiteCodes.length === 0 ? (
                      <span className="text-[13px] text-zinc-400">None</span>
                    ) : (
                      course.prerequisiteCodes.map((prerequisite) =>
                        course.availableCourseCodes.includes(prerequisite) ? (
                          <Link
                            key={prerequisite}
                            href={`/courses/${prerequisite}?year=${academicYear}`}
                            aria-label={`View prerequisite ${prerequisite}`}
                            className={cn(
                              chipClasses,
                              "font-mono transition-colors hover:bg-white hover:text-brand-700 hover:ring-brand-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-400 motion-reduce:transition-none",
                            )}
                          >
                            {prerequisite}
                          </Link>
                        ) : (
                          <span
                            key={prerequisite}
                            className={cn(chipClasses, "font-mono")}
                            title={`${prerequisite} is not published for ${academicYear}`}
                          >
                            {prerequisite}
                          </span>
                        ),
                      )
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex min-h-10 flex-wrap items-center gap-1">
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
                  </div>
                </TableCell>
                <TableCell className="p-0">
                  <div className="flex min-h-12 items-center justify-end px-3">
                    <CourseRowActions
                      course={{
                        code: course.code,
                        name: course.name,
                        sessions: course.sessions,
                        sourceUrl: course.sourceUrl,
                        year: academicYear,
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
