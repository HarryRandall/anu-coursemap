import { notFound, redirect } from "next/navigation";
import { canWriteCatalogue } from "@/lib/auth/viewer";
import { loadAdminStructureReview } from "@/lib/coursemap/admin-catalogue";
import { ProgrammeReview } from "./programme-review";

export const dynamic = "force-dynamic";

export default async function AdminProgrammeDetailPage({
  params,
  searchParams,
}: {
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
  if (id !== record.publicId) {
    redirect(`/admin/programmes/${record.publicId}?year=${record.year}`);
  }
  const canWrite = await canWriteCatalogue();

  return (
    <ProgrammeReview canEdit={canWrite} canPublish={canWrite} record={record} />
  );
}
