"use client";

import { Search } from "lucide-react";
import { Suspense, useMemo } from "react";
import type { ReuiCatalogueCategory } from "@reui/catalogue-data/catalogue.generated";
import { IsolatedCataloguePreviewFrame } from "@reui/catalogue-preview-frame";
import {
  componentMatchesReviewFilters,
  ComponentReviewProvider,
  useComponentReview,
} from "./review-context";
import {
  ReviewDecisionControl,
  ReviewToolbar,
  reviewSourceLabels,
  useReviewFilters,
} from "./review-controls";
import { untitledTabsReviewItems } from "./tabs-review-data";
import { componentReviewDomId, type ComponentReviewItem } from "./review-types";

function fullPreviewHeight(previewHeight?: string) {
  const suggestedHeight = Number(previewHeight);
  return Number.isFinite(suggestedHeight)
    ? Math.max(suggestedHeight, 520)
    : 520;
}

function ReviewItemCard({
  item,
  previewPath,
  height = 520,
}: {
  item: ComponentReviewItem;
  previewPath: string;
  height?: number;
}) {
  const { decisions } = useComponentReview();
  const decision = decisions[item.id]?.decision;

  return (
    <article
      id={componentReviewDomId(item.id)}
      tabIndex={-1}
      data-review-decision={decision ?? "unreviewed"}
      className="scroll-mt-40 overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="border-b border-secondary">
        <IsolatedCataloguePreviewFrame
          src={previewPath}
          title={item.title}
          interactive
          virtualised
          themeControl
          height={height}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-md font-semibold text-primary">{item.title}</h3>
            <span className="rounded-md bg-brand-primary px-2 py-1 text-xs font-semibold text-brand-secondary">
              {reviewSourceLabels[item.source]}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-tertiary">{item.description}</p>
          )}
          <p className="mt-1 truncate font-mono text-xs text-quaternary">
            {item.id}
          </p>
        </div>
        <ReviewDecisionControl item={item} />
      </div>
    </article>
  );
}

function ReviewSourceSection({
  title,
  items,
  previewPath,
  previewHeight,
}: {
  title: string;
  items: readonly ComponentReviewItem[];
  previewPath: (item: ComponentReviewItem) => string;
  previewHeight?: (item: ComponentReviewItem) => number;
}) {
  const { decisions } = useComponentReview();
  const { decisionFilter, sourceFilter } = useReviewFilters();
  const visibleItems = items.filter((item) =>
    componentMatchesReviewFilters(
      item,
      decisions[item.id]?.decision,
      decisionFilter,
      sourceFilter,
    ),
  );
  if (visibleItems.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 border-b border-secondary pb-3">
        <h2 className="text-display-xs font-semibold text-primary">{title}</h2>
        <span className="text-sm text-tertiary">
          {visibleItems.length} shown
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {visibleItems.map((item) => (
          <ReviewItemCard
            key={item.id}
            item={item}
            previewPath={previewPath(item)}
            height={previewHeight?.(item)}
          />
        ))}
      </div>
    </section>
  );
}

function ReviewCatalogueContents({
  untitledItems,
  reuiItems,
  reuiExamples,
}: {
  untitledItems: readonly ComponentReviewItem[];
  reuiItems: readonly ComponentReviewItem[];
  reuiExamples: ReuiCatalogueCategory["examples"];
}) {
  const { decisions } = useComponentReview();
  const { decisionFilter, sourceFilter } = useReviewFilters();
  const allItems = [...untitledItems, ...reuiItems];
  const visibleCount = allItems.filter((item) =>
    componentMatchesReviewFilters(
      item,
      decisions[item.id]?.decision,
      decisionFilter,
      sourceFilter,
    ),
  ).length;

  return (
    <div className="flex flex-col gap-10">
      <ReviewToolbar />

      {visibleCount > 0 ? (
        <>
          <ReviewSourceSection
            title="Untitled UI"
            items={untitledItems}
            previewPath={(item) =>
              `/design-system/review/preview/tabs/${item.id.split(":").at(-1)}`
            }
          />
          <ReviewSourceSection
            title="ReUI"
            items={reuiItems}
            previewPath={(item) => {
              const example = item.id.split(":").at(-1);
              return `/design-system/reui/preview/tabs/${example}`;
            }}
            previewHeight={(item) => {
              const exampleName = item.id.split(":").at(-1);
              const example = reuiExamples.find(
                (candidate) => candidate.name === exampleName,
              );
              return fullPreviewHeight(example?.previewHeight);
            }}
          />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-secondary bg-primary p-8 text-center">
          <Search aria-hidden className="size-6 text-fg-quaternary" />
          <p className="text-md font-semibold text-primary">
            No components match these filters
          </p>
          <p className="text-sm text-tertiary">
            Change the decision or source filter to continue reviewing.
          </p>
        </div>
      )}
    </div>
  );
}

export function TabsReviewCatalogue({
  reuiCategory,
}: {
  reuiCategory: ReuiCatalogueCategory;
}) {
  const reuiItems = useMemo<readonly ComponentReviewItem[]>(
    () =>
      reuiCategory.examples.map((example) => ({
        id: `reui:tabs:${example.name}`,
        family: "tabs",
        title: example.title,
        description: example.description,
        source: "reui",
      })),
    [reuiCategory.examples],
  );
  const items = useMemo(
    () => [...untitledTabsReviewItems, ...reuiItems],
    [reuiItems],
  );

  return (
    <ComponentReviewProvider items={items}>
      <Suspense
        fallback={
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        }
      >
        <ReviewCatalogueContents
          untitledItems={untitledTabsReviewItems}
          reuiItems={reuiItems}
          reuiExamples={reuiCategory.examples}
        />
      </Suspense>
    </ComponentReviewProvider>
  );
}
