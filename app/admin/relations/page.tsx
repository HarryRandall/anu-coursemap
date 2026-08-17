import { ClipboardCheck, GitBranch } from "lucide-react";
import { loadAdminRulePage } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

export default async function AdminRelationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const page = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  const data = await loadAdminRulePage({ page });
  const reviews = data.records.filter((rule) => rule.reviewState === "review");

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Catalogue quality
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Imported rules
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Original ANU wording is retained here. A review label means
              Coursemap does not claim that the rule was fully structured
              automatically. Open its course to compare every imported field,
              correct a draft and record the review decision.
            </p>
          </div>
          <ButtonLink href="/admin/sync/courses" size="sm" variant="secondary">
            Import courses
          </ButtonLink>
        </div>

        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <GitBranch className="text-brand-600" size={18} />
              <h2 className="text-sm font-semibold text-zinc-900">
                {data.total.toLocaleString("en-AU")} imported rules
              </h2>
            </div>
            <Badge tone={reviews.length ? "warning" : "success"}>
              {reviews.length} on this page need source review
            </Badge>
          </div>
          <div className="divide-y divide-zinc-100">
            {data.records.map((rule) => (
              <article
                key={rule.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-zinc-900">
                      {rule.code}
                    </span>
                    <Badge tone="neutral">{rule.kind}</Badge>
                    <Badge
                      tone={
                        rule.reviewState === "review" ? "warning" : "success"
                      }
                    >
                      {rule.reviewState === "review"
                        ? "Source review"
                        : "Reviewed"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {rule.sourceText}
                  </p>
                </div>
                <ButtonLink
                  href={`/admin/courses/${rule.code}`}
                  size="sm"
                  variant="secondary"
                >
                  <ClipboardCheck size={15} /> Review course
                </ButtonLink>
              </article>
            ))}
            {data.records.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-zinc-500">
                No imported rules are available yet.
              </p>
            )}
          </div>
          <div className="border-t border-zinc-100 bg-zinc-50/40 px-5 py-3">
            <Pagination
              pathname="/admin/relations"
              searchParams={{}}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="rules"
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
