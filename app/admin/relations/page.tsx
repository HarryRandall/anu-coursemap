import { ClipboardCheck, GitBranch } from "lucide-react";
import { loadAdminRulePage } from "@/lib/coursemap/admin-catalogue";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
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
        <h1 className="sr-only">Imported rules</h1>
        <Card className="overflow-hidden">
          <CardHeader
            className="border-b border-zinc-100"
            icon={<GitBranch className="text-brand-600" size={18} />}
            title={`${data.total.toLocaleString("en-AU")} imported rules`}
            action={
              <Badge tone={reviews.length ? "warning" : "success"}>
                {reviews.length} need review
              </Badge>
            }
          />
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
                    <ClipboardCheck size={15} /> Review course
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
                    <EmptyTitle>No imported rules</EmptyTitle>
                    <EmptyDescription>
                      Rules will appear after a catalogue import.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </li>
            )}
          </DataList>
          <CardFooter className="bg-zinc-50/40">
            <Pagination
              pathname="/admin/relations"
              searchParams={{}}
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
