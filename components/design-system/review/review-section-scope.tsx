"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { cx } from "@uui/utils/cx";
import {
  componentMatchesReviewFilters,
  useComponentReview,
} from "./review-context";
import { ReviewItemCard } from "./review-item-card";
import { useReviewFilters } from "./review-controls";
import {
  componentReviewItemId,
  type ComponentReviewItem,
  type ComponentReviewSource,
} from "./review-types";

type ReviewSectionMode = "catalogue" | "preview";

type ReviewSectionContextValue = {
  family: string;
  section: string;
  source: ComponentReviewSource;
  mode: ReviewSectionMode;
  targetId?: string;
};

const ReviewSectionContext = createContext<ReviewSectionContextValue | null>(
  null,
);

export function ReviewSectionScope({
  family,
  section,
  source,
  mode,
  targetId,
  children,
}: ReviewSectionContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ family, section, source, mode, targetId }),
    [family, mode, section, source, targetId],
  );
  return (
    <ReviewSectionContext.Provider value={value}>
      {children}
    </ReviewSectionContext.Provider>
  );
}

type ReviewAwareExampleProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bare?: boolean;
};

function ExampleSurface({
  title,
  description,
  children,
  className,
  bare = false,
  includeHeading = true,
}: ReviewAwareExampleProps & { includeHeading?: boolean }) {
  return (
    <section className="flex w-full flex-col gap-4">
      {includeHeading && (
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          {description && (
            <p className="text-tertiary text-sm">{description}</p>
          )}
        </div>
      )}

      <div
        className={cx(
          !bare && "rounded-xl bg-primary p-4 ring-1 ring-secondary md:p-6",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

function CatalogueExample({
  item,
  section,
}: {
  item: ComponentReviewItem;
  section: string;
}) {
  const { decisions, registerItem } = useComponentReview();
  const { decisionFilter, sourceFilter } = useReviewFilters();

  useEffect(() => registerItem(item), [item, registerItem]);

  if (
    !componentMatchesReviewFilters(
      item,
      decisions[item.id]?.decision,
      decisionFilter,
      sourceFilter,
    )
  ) {
    return null;
  }

  return (
    <ReviewItemCard
      item={item}
      previewPath={`/design-system/review/preview/lab/${item.family}/${section}/${encodeURIComponent(item.id)}`}
    />
  );
}

/**
 * Turns every existing laboratory Example into a review card when a review
 * scope is present, while leaving the original laboratory routes unchanged.
 */
export function ReviewAwareExample(props: ReviewAwareExampleProps) {
  const scope = useContext(ReviewSectionContext);
  const item = useMemo<ComponentReviewItem | null>(() => {
    if (!scope) return null;
    const base = {
      family: scope.family,
      source: scope.source,
      title: props.title,
      description: props.description,
    };
    return {
      ...base,
      id: componentReviewItemId({ ...base, namespace: scope.section }),
    };
  }, [props.description, props.title, scope]);

  if (!scope || !item) return <ExampleSurface {...props} />;

  if (scope.mode === "preview") {
    if (scope.targetId !== item.id) return null;
    return <ExampleSurface {...props} includeHeading={false} />;
  }

  return <CatalogueExample item={item} section={scope.section} />;
}
