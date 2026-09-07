"use client";
import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { Badge } from "@coursemap/ui/components/badge";
import { Button } from "@coursemap/ui/primitives/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coursemap/ui/primitives/empty";
import { CourseToken } from "@/ui/common/course-token";
import type { Attempt } from "@/lib/coursemap/types";
import { planningCourseForAttempt, unitsForAttempt } from "@/lib/planner";
import { badgeVariantForTone } from "@/lib/ui";
import { attemptTone } from "@/ui/requirements/requirement-presentation";

export function PlanCoursesCard({
  courses,
}: {
  courses: Array<{
    attempt: Attempt;
    course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
  }>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <CardTitle>
          <h2>Courses in your plan</h2>
        </CardTitle>
        <CardDescription>
          {courses.length} course{courses.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      {courses.length === 0 ? (
        <Empty className="rounded-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No planned or recorded courses yet</EmptyTitle>
            <EmptyDescription>
              Add courses on the plan board to see how they count.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/plan">Open the plan</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto">
          {courses.map(({ attempt, course }) => (
            <li
              key={attempt.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <CourseToken
                accent={course.accent}
                code={course.code}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <Link
                  className="block truncate text-sm font-medium text-foreground hover:underline"
                  href={`/courses/${course.code}?year=${course.year}`}
                >
                  {course.code}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {course.name}
                  </span>
                </Link>
                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                  {unitsForAttempt(attempt, course)} units
                </span>
              </span>
              <Badge variant={badgeVariantForTone[attemptTone(attempt.status)]}>
                {attempt.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
