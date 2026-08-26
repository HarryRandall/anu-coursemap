import { ClipboardCheck, GitBranch } from "lucide-react";
import { Suspense } from "react";
import {
  loadAdminRulePage,
  type AdminRuleListStatus,
} from "@/lib/coursemap/admin-catalogue";
import { AdminListControls } from "@/components/admin/admin-list-controls";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import {
  DataList,
  DataListActions,
  DataListContent,
  DataListDescription,
  DataListItem,
  DataListMeta,
} from "@/components/ui/data-list";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

const statuses: AdminRuleListStatus[] = ["all", "needs-review", "verified"];

const statusHeadings: Record<AdminRuleListStatus, string> = {
  all: "All imported rules",
  "needs-review": "Rules needing source review",
  verified: "Reviewed rules",
};

function first(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function AdminRelationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const page = Number(first(params.page));
  const query = (first(params.q) ?? "").trim();
  const requestedStatus = first(params.status) ?? "all";
  const status = statuses.includes(requestedStatus as AdminRuleListStatus)
    ? (requestedStatus as AdminRuleListStatus)
    : "all";
  const data = await loadAdminRulePage({ page, query, status });

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Rule review
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {statusHeadings[status]} · {data.total.toLocaleString("en-AU")}{" "}
            {data.total === 1 ? "rule" : "rules"}
          </p>
        </header>

        <Card className="overflow-hidden">
          <Suspense
            fallback={<div className="h-[65px] border-b border-zinc-200/80" />}
          >
            <AdminListControls
              searchPlaceholder="Search rule wording or kind"
              statuses={[
                { label: "All rules", value: "all" },
                { label: "Needs source review", value: "needs-review" },
                { label: "Reviewed", value: "verified" },
              ]}
            />
          </Suspense>
          <DataList>
            {data.records.map((rule) => (
              <DataListItem key={rule.id} className="items-start px-5 py-4">
                <DataListContent>
                  <DataListMeta>
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
                  </DataListMeta>
                  <DataListDescription className="mt-2 line-clamp-3 text-sm leading-6 whitespace-normal text-zinc-700">
                    {rule.sourceText}
                  </DataListDescription>
                </DataListContent>
                <DataListActions>
                  <ButtonLink
                    href={`/admin/courses/${rule.code}`}
                    size="sm"
                    variant="secondary"
                  >
                    <ClipboardCheck aria-hidden="true" size={15} /> Review
                    course
                  </ButtonLink>
                </DataListActions>
              </DataListItem>
            ))}
            {data.records.length === 0 && (
              <li>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GitBranch />
                    </EmptyMedia>
                    <EmptyTitle>No rules match this view</EmptyTitle>
                    <EmptyDescription>
                      Clear the search, choose a different status, or run an
                      import to bring rules in from ANU.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </li>
            )}
          </DataList>
          <CardFooter className="bg-zinc-50/40">
            <Pagination
              pathname="/admin/relations"
              searchParams={{
                ...(query ? { q: query } : {}),
                ...(status === "all" ? {} : { status }),
              }}
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              itemName="rules"
            />
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  );
}
