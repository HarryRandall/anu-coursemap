import { notFound, redirect } from "next/navigation";
import { loadAdminStructureReview } from "@/lib/coursemap/admin-catalogue";
import { isDemoMode } from "@/lib/supabase/config";
import { ProgrammeReview } from "./programme-review";

export const dynamic = "force-dynamic";

export default async function AdminProgrammeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await loadAdminStructureReview(id);
  if (!record) notFound();
  if (id !== record.publicId) {
    redirect(`/admin/programmes/${record.publicId}`);
  }

  return <ProgrammeReview canPublish={!isDemoMode()} record={record} />;
}
