import { notFound, redirect } from "next/navigation";
import { ProgrammeReview } from "@/app/admin/programmes/[id]/programme-review";
import { canWriteCatalogue } from "@/lib/auth/viewer";
import { loadAdminStructureReview } from "@/lib/coursemap/admin-catalogue";
import { adminAcademicStructureDetailPath } from "@/lib/coursemap/academic-structure-routes";
import {
  isAcademicStructureKind,
  type AcademicStructureKind,
} from "@/lib/structure-import/contract";

export async function AcademicStructureDetailPage({
  expectedKind,
  params,
  searchParams,
}: {
  expectedKind: AcademicStructureKind;
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const { year: rawYear } = await searchParams;
  const parsedYear = rawYear === undefined ? undefined : Number(rawYear);
  const requestedYear =
    parsedYear !== undefined && Number.isInteger(parsedYear)
      ? parsedYear
      : undefined;
  const record = await loadAdminStructureReview(id, requestedYear);
  if (!record) notFound();
  if (!isAcademicStructureKind(record.kind)) notFound();

  const canonicalPath = adminAcademicStructureDetailPath({
    kind: record.kind,
    publicId: record.publicId,
    year: record.year,
  });
  if (record.kind !== expectedKind || id !== record.publicId) {
    redirect(canonicalPath);
  }

  const canWrite = await canWriteCatalogue();
  return (
    <ProgrammeReview canEdit={canWrite} canPublish={canWrite} record={record} />
  );
}
