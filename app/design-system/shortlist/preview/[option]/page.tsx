import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ComponentReviewFile } from "@/components/design-system/review/review-types";
import {
  ReuiExampleRenderer,
  ReuiPreviewDocumentScope,
} from "@reui/example-renderer";
import { findShortlistOption } from "@/components/design-system/shortlist/catalogue";
import "./preview.css";
import { MatchedPreview } from "@/components/design-system/shortlist/matched-preview";

export default async function ShortlistPreview({
  params,
  searchParams,
}: {
  params: Promise<{ option: string }>;
  searchParams: Promise<{ states?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { option: id } = await params;
  const selected = findShortlistOption(id);
  if (!selected) notFound();
  const { states } = await searchParams;
  const candidates = states
    ? (selected.option.states ?? [])
    : selected.option.examples;
  let review: ComponentReviewFile | undefined;
  try {
    review = JSON.parse(
      await readFile(
        path.join(process.cwd(), "docs/design-system/component-review.json"),
        "utf8",
      ),
    ) as ComponentReviewFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const names = candidates.filter(
    (name) =>
      review?.decisions[`reui:${selected.round.category}:${name}`]?.decision !==
      "remove",
  );
  return (
    <main className="shortlist-preview reui-scope style-nova">
      <ReuiPreviewDocumentScope />
      {selected.option.comparison && (
        <MatchedPreview
          kind={selected.option.comparison}
          states={states === "1"}
        />
      )}
      {!selected.option.comparison && names.length === 0 && (
        <p>
          No remaining examples in this set. Your removed examples stay hidden.
        </p>
      )}
      {!selected.option.comparison &&
        names.map((name) => (
          <div key={name} className="shortlist-example">
            <ReuiExampleRenderer name={name} />
          </div>
        ))}
    </main>
  );
}
