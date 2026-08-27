import { notFound } from "next/navigation";
import { AdminUserDetail } from "@/components/admin/user-detail";
import { loadAdminUserDetail } from "@/lib/admin/users";
import { getAuthContext } from "@/lib/auth/viewer";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { viewer }] = await Promise.all([params, getAuthContext()]);
  if (!viewer) return null;

  const data = await loadAdminUserDetail(id);
  if (!data) notFound();

  return <AdminUserDetail currentUserId={viewer.id} data={data} />;
}

export const dynamic = "force-dynamic";
