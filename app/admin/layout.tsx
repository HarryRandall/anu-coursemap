import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isDemoMode()) return children;

  const { viewer, canAccessAdmin } = await getAuthContext();
  if (!viewer) {
    redirect("/auth/sign-in?next=%2Fadmin%2Fdashboard");
  }

  if (!canAccessAdmin) {
    redirect("/plan?notice=admin-access-required");
  }

  return children;
}
