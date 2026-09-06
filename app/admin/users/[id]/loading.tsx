"use client";

import { useParams } from "next/navigation";
import { UserDetailLoadingSkeleton } from "@/components/admin/access-loading";
import { AppShell } from "@/components/shell";

export default function AdminUserDetailLoading() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell admin breadcrumbSegmentLabels={{ [id]: null }}>
      <div aria-busy="true">
        <span className="sr-only">Loading user details</span>
        <UserDetailLoadingSkeleton />
      </div>
    </AppShell>
  );
}
