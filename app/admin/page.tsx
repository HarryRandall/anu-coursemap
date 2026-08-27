import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import { loadAdminUserSummary } from "@/lib/admin/users";
import { loadAdminCatalogueSummary } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { StatTile } from "@/components/ui/stat-tile";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [summary, users] = await Promise.all([
    loadAdminCatalogueSummary(),
    loadAdminUserSummary(),
  ]);

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <h1 className="sr-only">Live catalogue status</h1>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            href="/admin/courses"
            icon={<BookOpen aria-hidden="true" />}
            label="Courses"
            trend={summary.courseHistory}
            trendLabel="Course catalogue growth to the current total"
            value={summary.courses}
          />
          <StatTile
            href="/admin/programmes"
            icon={<GraduationCap aria-hidden="true" />}
            label="Programmes"
            trend={summary.structureHistory}
            trendLabel="Programme catalogue growth to the current total"
            value={summary.structures}
          />
          <StatTile
            href="/admin/courses?status=draft"
            icon={<AlertTriangle aria-hidden="true" />}
            label="Drafts"
            trend={summary.draftHistory}
            trendLabel="Draft catalogue growth to the current total"
            value={summary.courseDrafts + summary.structureDrafts}
          />
          <StatTile
            href="/admin/users"
            icon={<UsersRound aria-hidden="true" />}
            label="Users"
            trend={users.history}
            trendLabel="Account growth to the current total"
            value={users.users}
          />
        </div>
      </div>
    </AppShell>
  );
}
