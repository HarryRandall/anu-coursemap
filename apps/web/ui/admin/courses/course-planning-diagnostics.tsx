import { CircleAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/components/alert";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { parseRequisiteSummary } from "@/lib/coursemap/requisite-summary";

export function CoursePlanningDiagnostics({
  course,
}: {
  course: CourseDetails;
}) {
  const unitsUnavailable =
    course.unitValue.kind === "unknown" ||
    (course.unitValue.kind === "variable" &&
      course.unitValue.options.length === 0);
  const source = course.prerequisiteText.trim();
  const needsRuleReview =
    source.length > 0 &&
    !/^No prerequisites listed\.?$/iu.test(source) &&
    !course.prerequisiteRule?.expression &&
    !parseRequisiteSummary(source);
  const missingCodes = course.prerequisiteCodes.filter(
    (code) => !course.availableCourseCodes.includes(code),
  );
  if (!needsRuleReview && missingCodes.length === 0 && !unitsUnavailable)
    return null;
  return (
    <Alert variant="warning">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>Planning data review</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-2 pl-4">
          {unitsUnavailable ? (
            <li>
              The course unit value is not recorded. Review its unit options
              before students can record an attempt.
            </li>
          ) : null}
          {needsRuleReview ? (
            <li>
              Prerequisite logic cannot be checked automatically. Review and
              model this source rule:{" "}
              <blockquote className="mt-1 whitespace-pre-wrap">
                {source}
              </blockquote>
            </li>
          ) : null}
          {missingCodes.length > 0 ? (
            <li>
              Referenced courses are unavailable in this catalogue year:{" "}
              {missingCodes.join(", ")}. Import and review their records.
            </li>
          ) : null}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
