import {
  AnuCourseDirectoryHttpError,
  type AnuCourseDirectory,
} from "./anu-course-directory.ts";

export type CourseDirectoryAvailabilityUpdate = {
  sourceAvailability: "unknown" | "available" | "unavailable";
  checkedAt: string;
  availabilityNote: string | null;
  markDirectoryRefreshed: boolean;
  retireMissingEntries: boolean;
};

export function courseDirectoryResponsePolicy(
  directory: AnuCourseDirectory,
): CourseDirectoryAvailabilityUpdate {
  const hasDiagnostics = directory.diagnostics.length > 0;
  const hasUsableSourceRows = directory.entries.some(
    (entry) => typeof entry.name === "string" && entry.name.trim() !== "",
  );
  const isPermanentNoData =
    directory.isComplete &&
    directory.totalCount === 0 &&
    directory.receivedItemCount === 0;

  if (isPermanentNoData) {
    return {
      sourceAvailability: "unavailable",
      checkedAt: directory.fetchedAt,
      availabilityNote: `ANU returned a complete course directory with no courses for ${directory.academicYear}.`,
      markDirectoryRefreshed: false,
      retireMissingEntries: false,
    };
  }

  if (directory.isComplete && !hasDiagnostics && hasUsableSourceRows) {
    return {
      sourceAvailability: "available",
      checkedAt: directory.fetchedAt,
      availabilityNote: null,
      markDirectoryRefreshed: true,
      retireMissingEntries: true,
    };
  }

  if (hasUsableSourceRows) {
    return {
      sourceAvailability: "available",
      checkedAt: directory.fetchedAt,
      availabilityNote:
        "ANU returned course data, but the directory response was incomplete or contained diagnostics. Existing directory entries were preserved.",
      markDirectoryRefreshed: false,
      retireMissingEntries: false,
    };
  }

  return {
    sourceAvailability: "unknown",
    checkedAt: directory.fetchedAt,
    availabilityNote:
      "The ANU course directory response could not be used. Existing directory entries were preserved.",
    markDirectoryRefreshed: false,
    retireMissingEntries: false,
  };
}

export function isPermanentCourseDirectoryNoDataError(
  error: unknown,
): error is AnuCourseDirectoryHttpError {
  return (
    error instanceof AnuCourseDirectoryHttpError &&
    (error.status === 404 || error.status === 410)
  );
}

export function courseDirectoryFailurePolicy({
  academicYear,
  error,
  checkedAt,
}: {
  academicYear: number;
  error: unknown;
  checkedAt: string;
}): CourseDirectoryAvailabilityUpdate {
  if (isPermanentCourseDirectoryNoDataError(error)) {
    return {
      sourceAvailability: "unavailable",
      checkedAt,
      availabilityNote: `ANU returned HTTP ${error.status}, so no course directory is available for ${academicYear}.`,
      markDirectoryRefreshed: false,
      retireMissingEntries: false,
    };
  }

  const detail = error instanceof Error ? error.message : "Unknown error.";
  return {
    sourceAvailability: "unknown",
    checkedAt,
    availabilityNote: `The ANU course directory check failed: ${detail}`,
    markDirectoryRefreshed: false,
    retireMissingEntries: false,
  };
}
