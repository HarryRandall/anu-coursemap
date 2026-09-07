import type { CourseDetails } from "@/lib/coursemap/course-types";

export function formatUpdatedAt(value: string | null) {
  if (!value) return "Not listed";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
export function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
export function unitValueLabel(course: CourseDetails) {
  if (course.unitValue.kind === "fixed") {
    return `${course.unitValue.units} units`;
  }
  if (course.unitValue.kind === "range") {
    return `${course.unitValue.minimumUnits}-${course.unitValue.maximumUnits} units`;
  }
  if (course.unitValue.kind === "variable") {
    return course.unitValue.options.length
      ? `${course.unitValue.options.map((option) => option.units).join(" or ")} units`
      : "Variable units";
  }
  return "Units not listed";
}
export function feeValue(fee: CourseDetails["fees"][number]) {
  if (fee.amount !== null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: fee.currency ?? "AUD",
      maximumFractionDigits: fee.amount % 1 === 0 ? 0 : 2,
    }).format(fee.amount);
  }
  if (fee.studentContributionBand !== null) {
    return `Student contribution band ${fee.studentContributionBand}`;
  }
  return fee.sourceText ?? "See the ANU source";
}
export function humanise(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./u, (letter) => letter.toUpperCase());
}
