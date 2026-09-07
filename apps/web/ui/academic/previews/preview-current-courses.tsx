import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@coursemap/ui/primitives/card";
import { Button } from "@coursemap/ui/primitives/button";
import { Plus } from "lucide-react";
import type { PreviewCourse } from "./preview-data";

export function PreviewCurrentCourses({
  courses,
  onSelect,
}: {
  courses: PreviewCourse[];
  onSelect: (code: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current courses</CardTitle>
        <p className="text-xs text-muted-foreground">Semester 2, 2026</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {courses.length ? (
          courses.map((course) => (
            <div
              key={course.code}
              className="space-y-3 border-b pb-5 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{course.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {course.code}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(course.code)}
              >
                <Plus aria-hidden="true" />
                Add result
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No current courses</p>
        )}
      </CardContent>
    </Card>
  );
}
