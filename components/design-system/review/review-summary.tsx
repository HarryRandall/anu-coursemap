"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { reviewSourceLabels } from "./review-controls";
import {
  componentReviewDomId,
  emptyComponentReviewFile,
  type ComponentReviewDecision,
  type ComponentReviewFile,
} from "./review-types";

const decisionLabels: Record<ComponentReviewDecision, string> = {
  preferred: "Preferred",
  keep: "Keep",
  remove: "Remove",
};

export function ComponentReviewSummary() {
  const [review, setReview] = useState(emptyComponentReviewFile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadReview() {
      try {
        const response = await fetch("/api/design-system/review", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load your review");
        setReview((await response.json()) as ComponentReviewFile);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your review",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadReview();
    return () => controller.abort();
  }, []);

  const records = useMemo(
    () =>
      Object.values(review.decisions).sort(
        (left, right) =>
          left.family.localeCompare(right.family) ||
          left.source.localeCompare(right.source) ||
          left.title.localeCompare(right.title),
      ),
    [review.decisions],
  );

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-secondary bg-primary">
        <p className="text-tertiary flex items-center gap-2 text-sm font-semibold">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          Loading review
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-error bg-error-primary text-error-primary rounded-xl border p-5 text-sm font-semibold">
        {error}
      </div>
    );
  }

  const counts = {
    preferred: records.filter((record) => record.decision === "preferred")
      .length,
    keep: records.filter((record) => record.decision === "keep").length,
    remove: records.filter((record) => record.decision === "remove").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/design-system/redesign"
        className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-secondary bg-primary p-4 font-semibold text-primary"
      >
        Compare navigation and dashboard directions
        <ArrowRight aria-hidden className="size-5 shrink-0" />
      </Link>
      <Link
        href="/design-system/shortlist"
        className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-secondary bg-primary p-4 font-semibold text-primary"
      >
        Open the shorter component review: ten focused rounds
        <ArrowRight aria-hidden className="size-5 shrink-0" />
      </Link>
      <Link
        href="/design-system/compare"
        className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-secondary bg-primary p-4 font-semibold text-primary"
      >
        Pick your style: compare fonts, colours and spacing
        <ArrowRight aria-hidden className="size-5 shrink-0" />
      </Link>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(counts) as ComponentReviewDecision[]).map((decision) => (
          <div
            key={decision}
            className="rounded-xl border border-secondary bg-primary p-4 shadow-xs"
          >
            <p className="text-tertiary text-sm font-semibold">
              {decisionLabels[decision]}
            </p>
            <p className="text-display-xs mt-1 font-semibold text-primary">
              {counts[decision]}
            </p>
          </div>
        ))}
      </div>

      {records.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
          <ul className="divide-y divide-secondary">
            {records.map((record) => (
              <li
                key={record.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">{record.title}</p>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary">
                      {reviewSourceLabels[record.source]}
                    </span>
                    <span className="bg-brand-primary text-brand-secondary rounded-md px-2 py-0.5 text-xs font-semibold">
                      {decisionLabels[record.decision]}
                    </span>
                  </div>
                  <p className="text-quaternary mt-1 truncate font-mono text-xs">
                    {record.id}
                  </p>
                </div>
                <Link
                  href={
                    record.family === "redesign"
                      ? "/design-system/redesign"
                      : record.family === "shortlist"
                        ? "/design-system/shortlist"
                        : record.family === "foundations"
                          ? "/design-system/compare"
                          : `/design-system/review/${record.family}#${componentReviewDomId(record.id)}`
                  }
                  className="text-brand-secondary outline-focus-ring hover:bg-primary_hover flex min-h-10 shrink-0 items-center gap-1.5 self-start rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:self-auto"
                >
                  View component
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-secondary bg-primary p-8 text-center">
          <p className="text-md font-semibold text-primary">
            Nothing reviewed yet
          </p>
          <Link
            href="/design-system/review/accordion"
            className="bg-brand-solid outline-focus-ring hover:bg-brand-solid_hover flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Browse all component types
          </Link>
        </div>
      )}
    </div>
  );
}
