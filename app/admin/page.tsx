import { AlertTriangle, BookOpen, GraduationCap, Upload } from "lucide-react";
import { loadAdminCatalogueSummary } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const summary = await loadAdminCatalogueSummary();

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Catalogue administration
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
              Live catalogue status
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Counts come directly from the current published catalogue year.
            </p>
          </div>
          <ButtonLink href="/admin/sync/courses" size="sm">
            <Upload size={15} /> Import courses
          </ButtonLink>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <BookOpen className="text-brand-600" size={19} />
            <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-950">
              {summary.courses}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Imported course versions
            </p>
            <ButtonLink
              className="mt-4"
              href="/admin/courses"
              size="sm"
              variant="secondary"
            >
              Review courses
            </ButtonLink>
          </Card>
          <Card className="p-5">
            <GraduationCap className="text-brand-600" size={19} />
            <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-950">
              {summary.structures}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Imported programme structures
            </p>
            <ButtonLink
              className="mt-4"
              href="/admin/programmes"
              size="sm"
              variant="secondary"
            >
              Review programmes
            </ButtonLink>
          </Card>
          <Card className="p-5">
            <AlertTriangle className="text-amber-600" size={19} />
            <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-950">
              {summary.courseDrafts + summary.structureDrafts}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Drafts awaiting publication · {summary.reviewItems} with source
              review
            </p>
            <ButtonLink
              className="mt-4"
              href="/admin/courses"
              size="sm"
              variant="secondary"
            >
              Publish reviewed records
            </ButtonLink>
          </Card>
        </div>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-zinc-900">
            Publication workflow
          </h2>
          <ol className="mt-3 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
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
        </Card>
      </div>
    </AppShell>
  );
}
