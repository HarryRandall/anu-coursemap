"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import type { ReuiCatalogueCategory } from "@reui/catalogue-data/catalogue.generated";
import {
  componentMatchesReviewFilters,
  ComponentReviewProvider,
  useComponentReview,
} from "./review-context";
import { ReviewToolbar, useReviewFilters } from "./review-controls";
import { fullReviewPreviewHeight, ReviewItemCard } from "./review-item-card";
import type { ComponentReviewItem } from "./review-types";

function ReuiReviewSection({
  category,
  family,
}: {
  category: ReuiCatalogueCategory;
  family: string;
}) {
  const { decisions } = useComponentReview();
  const { decisionFilter, sourceFilter } = useReviewFilters();
  const items = category.examples.map<ComponentReviewItem>((example) => ({
    id: `reui:${category.name}:${example.name}`,
    family,
    title: example.title,
    description: example.description,
    source: "reui",
  }));
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
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-secondary uppercase">
            ReUI
          </p>
          <h2 className="text-display-xs font-semibold text-primary">
            {category.label}
          </h2>
        </div>
        <span className="text-sm text-tertiary">
          {visibleItems.length} shown
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {visibleItems.map((item) => {
          const exampleName = item.id.split(":").at(-1);
          const example = category.examples.find(
            (candidate) => candidate.name === exampleName,
          );
          if (!example) return null;
          return (
            <ReviewItemCard
              key={item.id}
              item={item}
              previewPath={`/design-system/reui/preview/${category.name}/${example.name}`}
              height={fullReviewPreviewHeight(example.previewHeight)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ReviewFamilyContents({
  family,
  categories,
  children,
}: {
  family: string;
  categories: readonly ReuiCatalogueCategory[];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10">
      <ReviewToolbar />
      {children}
      {categories.map((category) => (
        <ReuiReviewSection
          key={category.name}
          category={category}
          family={family}
        />
      ))}
    </div>
  );
}

export function ReviewFamilyCatalogue({
  family,
  categories,
  children,
}: {
  family: string;
  categories: readonly ReuiCatalogueCategory[];
  children: ReactNode;
}) {
  const initialItems = useMemo<readonly ComponentReviewItem[]>(
    () =>
      categories.flatMap((category) =>
        category.examples.map((example) => ({
          id: `reui:${category.name}:${example.name}`,
          family,
          title: example.title,
          description: example.description,
          source: "reui" as const,
        })),
      ),
    [categories, family],
  );

  return (
    <ComponentReviewProvider key={family} items={initialItems}>
      <Suspense
        fallback={
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        }
      >
        <ReviewFamilyContents family={family} categories={categories}>
          {children}
        </ReviewFamilyContents>
      </Suspense>
    </ComponentReviewProvider>
  );
}
