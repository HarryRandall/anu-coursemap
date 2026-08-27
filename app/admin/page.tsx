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

  const trendDomainMax = Math.max(
    summary.courses,
    summary.structures,
    summary.courseDrafts + summary.structureDrafts,
    users.users,
    1,
  );

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <h1 className="sr-only">Live catalogue status</h1>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            href="/admin/courses"
            icon={<BookOpen aria-hidden="true" />}
            label="Courses"
            trend={summary.courseHistory}
            trendDomainMax={trendDomainMax}
            trendLabel="Course catalogue growth to the current total"
            value={summary.courses}
          />
          <StatTile
            href="/admin/programmes"
            icon={<GraduationCap aria-hidden="true" />}
            label="Programmes"
            trend={summary.structureHistory}
            trendDomainMax={trendDomainMax}
            trendLabel="Programme catalogue growth to the current total"
            value={summary.structures}
          />
          <StatTile
            href="/admin/courses?status=draft"
            icon={<AlertTriangle aria-hidden="true" />}
            label="Drafts"
            trend={summary.draftHistory}
            trendDomainMax={trendDomainMax}
            trendLabel="Draft catalogue growth to the current total"
            value={summary.courseDrafts + summary.structureDrafts}
          />
          <StatTile
            href="/admin/users"
            icon={<UsersRound aria-hidden="true" />}
            label="Users"
            trend={users.history}
            trendDomainMax={trendDomainMax}
            trendLabel="Account growth to the current total"
            value={users.users}
          />
        </div>
      </div>
    </AppShell>
  );
}
