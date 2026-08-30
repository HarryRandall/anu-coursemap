import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import { ImportModelCard } from "@/components/admin/import-model-card";
import { loadImportModelSetting } from "@/lib/admin/settings";
import { loadAdminUserSummary } from "@/lib/admin/users";
import { canManageCourseImports } from "@/lib/auth/viewer";
import { loadAdminCatalogueSummary } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { StatTile } from "@/components/ui/stat-tile";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [summary, users, importModel, canManageImports] = await Promise.all([
    loadAdminCatalogueSummary(),
    loadAdminUserSummary(),
    loadImportModelSetting(),
    canManageCourseImports(),
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
            trend={summary.programmeHistory}
            trendLabel="Programme catalogue growth to the current total"
            value={summary.programmes}
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

        <ImportModelCard
          canManage={canManageImports}
          configured={importModel.configured}
          model={importModel.model}
          options={importModel.options}
          updatedAt={importModel.updatedAt}
        />
      </div>
    </AppShell>
  );
}
