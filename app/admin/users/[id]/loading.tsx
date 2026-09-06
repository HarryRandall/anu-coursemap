"use client";

import { useParams } from "next/navigation";
import { UserDetailLoadingSkeleton } from "@/components/admin/access-loading";
import { AppShell } from "@/components/shell";
import { TabsLoading } from "@/components/ui/tabs-loading";

export default function AdminUserDetailLoading() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell
      admin
      breadcrumbSegmentLabels={{ [id]: null }}
      tabs={<TabsLoading widths={["w-16", "w-12", "w-14"]} />}
    >
      <div aria-busy="true">
        <span className="sr-only">Loading user details</span>
        <UserDetailLoadingSkeleton />
      </div>
    </AppShell>
  );
}
