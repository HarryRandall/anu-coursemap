"use client";

import { IsolatedCataloguePreviewFrame } from "@reui/catalogue-preview-frame";
import { ReviewDecisionControl, reviewSourceLabels } from "./review-controls";
import { useComponentReview } from "./review-context";
import { componentReviewDomId, type ComponentReviewItem } from "./review-types";

export function fullReviewPreviewHeight(previewHeight?: string) {
  const suggestedHeight = Number(previewHeight);
  return Number.isFinite(suggestedHeight)
    ? Math.max(suggestedHeight, 520)
    : 520;
}

export function ReviewItemCard({
  item,
  previewPath,
  height = 640,
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
      className="outline-focus-ring scroll-mt-40 overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
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
            <span className="bg-brand-primary text-brand-secondary rounded-md px-2 py-1 text-xs font-semibold">
              {reviewSourceLabels[item.source]}
            </span>
          </div>
          {item.description && (
            <p className="text-tertiary mt-1 text-sm">{item.description}</p>
          )}
          <p className="text-quaternary mt-1 truncate font-mono text-xs">
            {item.id}
          </p>
        </div>
        <ReviewDecisionControl item={item} />
      </div>
    </article>
  );
}
