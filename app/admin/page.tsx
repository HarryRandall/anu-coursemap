import { AlertTriangle, BookOpen, GraduationCap } from "lucide-react";
import { loadAdminCatalogueSummary } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const summary = await loadAdminCatalogueSummary();

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <h1 className="sr-only">Live catalogue status</h1>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Courses"
            value={summary.courses}
            description="Imported course versions"
            icon={<BookOpen aria-hidden="true" />}
            action={
              <ButtonLink href="/admin/courses" size="sm" variant="secondary">
                Review courses
              </ButtonLink>
            }
          />
          <StatTile
            label="Programmes"
            value={summary.structures}
            description="Imported programme structures"
            icon={<GraduationCap aria-hidden="true" />}
            action={
              <ButtonLink
                href="/admin/programmes"
                size="sm"
                variant="secondary"
              >
                Review programmes
              </ButtonLink>
            }
          />
          <StatTile
            label="Drafts"
            value={summary.courseDrafts + summary.structureDrafts}
            description={`${summary.reviewItems} with source review`}
            icon={<AlertTriangle aria-hidden="true" />}
            action={
              <ButtonLink href="/admin/courses" size="sm" variant="secondary">
                Publish reviewed records
              </ButtonLink>
            }
          />
        </div>
        <Card>
          <CardHeader title="Publication workflow" />
          <CardContent>
            <ol className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
              <li>
                <strong className="text-zinc-900">1. Import</strong>
                <br />
                Save ANU source facts and diagnostic warnings.
              </li>
              <li>
                <strong className="text-zinc-900">2. Review</strong>
                <br />
                Check wording and any unresolved rules.
              </li>
              <li>
                <strong className="text-zinc-900">3. Publish</strong>
                <br />
                Make the reviewed course or programme available to students.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
