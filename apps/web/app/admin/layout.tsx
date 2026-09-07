import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/viewer";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { viewer, canAccessAdmin } = await getAuthContext();
  if (!viewer) {
    redirect("/login?next=%2Fadmin%2Fdashboard");
  }

  if (!canAccessAdmin) {
    notFound();
  }

  return children;
}
