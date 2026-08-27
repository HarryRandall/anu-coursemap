import { notFound, redirect } from "next/navigation";
import { AdminNavProvider } from "@/components/admin/admin-nav-context";
import { loadOpenChangeCount } from "@/components/admin/imports/imports-overview-data";
import { getAuthContext } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isDemoMode()) {
    return (
      <AdminNavProvider openChangeCount={await loadOpenChangeCount()}>
        {children}
      </AdminNavProvider>
    );
  }

  const { viewer, canAccessAdmin } = await getAuthContext();
  if (!viewer) {
    redirect("/login?next=%2Fadmin%2Fdashboard");
  }

  if (!canAccessAdmin) {
    notFound();
  }

  return (
    <AdminNavProvider openChangeCount={await loadOpenChangeCount()}>
      {children}
    </AdminNavProvider>
  );
}
