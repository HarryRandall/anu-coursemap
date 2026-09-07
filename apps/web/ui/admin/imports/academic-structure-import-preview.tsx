import { ImportEmptyState } from "./import-empty-state";
import { Badge } from "@coursemap/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@coursemap/ui/primitives/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coursemap/ui/primitives/table";
import { DataTableShell } from "@/ui/common/data-table";
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
import { AcademicStructureImportRequirementTree } from "./academic-structure-import-requirements";
import {
  AcademicStructureImportSummary,
  readableImportValue as readable,
  formatFee,
} from "./academic-structure-import-summary";

export function AcademicStructureImportPreview({
  detail,
}: {
  detail: AcademicStructureImportTargetDetail;
}) {
  const hasRequirements =
    detail.relationalData.academic_structure_requirement_groups.length > 0 ||
    detail.relationalData.academic_structure_unmodelled_requirements.length > 0;
  const snapshot = detail.candidateSnapshot;
  if (!snapshot) {
    return <ImportEmptyState kind="preview" />;
  }
  const fields = detail.relationalData.academic_structure_summary_fields;
  const sections = detail.relationalData.academic_structure_snapshot_sections;
  const outcomes = detail.relationalData.academic_structure_learning_outcomes;
  const fees = detail.relationalData.academic_structure_fees;
  const relationships =
    detail.relationalData.academic_structure_snapshot_relationships;
  const evidence = detail.relationalData.academic_structure_snapshot_evidence;

  return (
    <div className="space-y-5">
      <AcademicStructureImportSummary detail={detail} />

      {fields.length ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{"Source summary"}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((item) => (
                <div key={item.id}>
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="mt-1 text-foreground/90">
                    {item.field_value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {sections.length ? (
        <section className="space-y-3" aria-labelledby="candidate-sections">
          <h2
            className="text-sm font-semibold text-foreground"
            id="candidate-sections"
          >
            Page sections
          </h2>
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>
                  <h2>{section.heading}</h2>
                </CardTitle>
                {section.source_locator && (
                  <CardDescription>
                    <span className="font-mono">{section.source_locator}</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto text-sm leading-6 whitespace-pre-wrap text-foreground/80">
                  {section.markdown}
                </pre>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {outcomes.length ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{"Learning outcomes"}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground/80">
              {outcomes.map((outcome) => (
                <li key={outcome.id}>{outcome.outcome_text}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {hasRequirements && (
        <section className="space-y-3" aria-labelledby="candidate-requirements">
          <h2
            className="text-sm font-semibold text-foreground"
            id="candidate-requirements"
          >
            Requirements
          </h2>
          <AcademicStructureImportRequirementTree detail={detail} />
        </section>
      )}

      {fees.length > 0 && (
        <section className="space-y-3" aria-labelledby="candidate-fees">
          <h2
            className="text-sm font-semibold text-foreground"
            id="candidate-fees"
          >
            Fees
          </h2>
          <DataTableShell>
            <Table className="min-w-[780px]">
              <TableCaption className="sr-only">
                Imported fee records
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Audience</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>{readable(fee.audience)}</TableCell>
                    <TableCell>{readable(fee.fee_type)}</TableCell>
                    <TableCell className="tabular-nums">
                      {fee.fee_year ?? "Not stated"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatFee(fee.amount, fee.currency)}
                    </TableCell>
                    <TableCell>{readable(fee.basis)}</TableCell>
                    <TableCell className="max-w-72 text-xs text-muted-foreground">
                      {fee.source_label ?? fee.source_text}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </section>
      )}

      {relationships.length > 0 && (
        <section
          className="space-y-3"
          aria-labelledby="candidate-relationships"
        >
          <h2
            className="text-sm font-semibold text-foreground"
            id="candidate-relationships"
          >
            Relationships
          </h2>
          <DataTableShell>
            <Table className="min-w-[720px]">
              <TableCaption className="sr-only">
                Imported academic structure relationships
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Relationship</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationships.map((relationship) => (
                  <TableRow key={relationship.id}>
                    <TableCell>
                      {readable(relationship.relationship_kind)}
                    </TableCell>
                    <TableCell>{readable(relationship.target_kind)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {relationship.target_code}
                    </TableCell>
                    <TableCell>
                      {relationship.target_title ?? "Not recorded"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </section>
      )}

      {evidence.length ? (
        <details className="group rounded-xl border border-border bg-card shadow-xs">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Evidence and confidence
            <Badge variant={"outline"}>{evidence.length} records</Badge>
          </summary>
          <div className="divide-y divide-border/60 border-t border-border/60">
            {evidence.map((item) => (
              <div className="p-4 text-xs" key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium text-foreground/90">
                    {item.field_key}
                  </span>
                  <Badge variant={"outline"}>{item.method}</Badge>
                  <Badge variant={"primary-light"}>
                    {Math.round(item.confidence * 100)}%
                  </Badge>
                </div>
                <blockquote className="mt-2 border-l-2 border-input pl-3 leading-5 text-muted-foreground">
                  {item.evidence_excerpt}
                </blockquote>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
