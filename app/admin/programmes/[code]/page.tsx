import { notFound } from "next/navigation";
import { loadAdminStructureReview } from "@/lib/coursemap/admin-catalogue";
import { isDemoMode } from "@/lib/supabase/config";
import { ProgrammeReview } from "./programme-review";

export const dynamic = "force-dynamic";

export default async function AdminProgrammeDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const record = await loadAdminStructureReview(code);
  if (!record) notFound();

  return <ProgrammeReview canPublish={!isDemoMode()} record={record} />;
}
