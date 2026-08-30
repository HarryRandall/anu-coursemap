import { notFound } from "next/navigation";
import { CourseImportTargetReview } from "@/components/admin/imports/course-import-target-review";
import { loadCourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import type {
  CourseDetails,
  CoursePrerequisiteEdge,
} from "@/lib/coursemap/course-types";
import {
  courseFromSnapshotProjection,
  loadPublishedCoursesByCodes,
} from "@/lib/coursemap/published-courses";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

function edgeKey(edge: CoursePrerequisiteEdge) {
  return `${edge.from}->${edge.to}`;
}

async function candidateStudentPreview(
  detail: NonNullable<Awaited<ReturnType<typeof loadCourseImportTargetDetail>>>,
): Promise<CourseDetails | null> {
  if (!detail.candidateProjection || !detail.candidateSnapshot) return null;
  const candidate = courseFromSnapshotProjection(
    detail.candidateProjection as unknown as Json,
    detail.candidateSnapshot.id,
  );
  if (!candidate) return null;

  let dependencies: CourseDetails[] = [];
  try {
    dependencies = await loadPublishedCoursesByCodes(
      candidate.prerequisiteCodes,
      detail.run.academicYear,
    );
  } catch {
    // The draft itself is still useful when a referenced published course
    // cannot be loaded. The graph marks that reference as unavailable.
  }
  const dependencyCodes = new Set(
    dependencies.map((dependency) => dependency.code),
  );
  const availableCourseCodes = new Set<string>();
  const edges = new Map<string, CoursePrerequisiteEdge>();
  for (const dependency of dependencies) {
    availableCourseCodes.add(dependency.code);
    dependency.availableCourseCodes.forEach((code) =>
      availableCourseCodes.add(code),
    );
    dependency.prerequisiteEdges.forEach((edge) =>
      edges.set(edgeKey(edge), edge),
    );
  }
  for (const code of candidate.prerequisiteCodes) {
    const edge = {
      from: code,
      to: candidate.code,
      fromIsAvailable: dependencyCodes.has(code),
      toIsAvailable: false,
    } satisfies CoursePrerequisiteEdge;
    edges.set(edgeKey(edge), edge);
  }

  return {
    ...candidate,
    availableCourseCodes: [...availableCourseCodes].sort(),
    prerequisiteEdges: [...edges.values()],
    publicationStatus: "draft",
    reviewState: detail.candidateSnapshot.has_critical_uncertainty
      ? "review"
      : "automatic",
  };
}

export default async function CourseImportTargetPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = await params;
  const detail = await loadCourseImportTargetDetail({ targetId });
  if (!detail) notFound();
  const previewCourse = await candidateStudentPreview(detail);
  return (
    <CourseImportTargetReview detail={detail} previewCourse={previewCourse} />
  );
}
