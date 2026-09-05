"use client";

import { Check, Circle, CircleDot, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import { cx } from "@uui/utils/cx";
import {
  componentMatchesReviewFilters,
  type ComponentReviewFilter,
  type ComponentReviewSourceFilter,
  useComponentReview,
} from "./review-context";
import type {
  ComponentReviewDecision,
  ComponentReviewItem,
  ComponentReviewSource,
} from "./review-types";

const decisionChoices: ReadonlyArray<{
  value: ComponentReviewDecision | null;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  selectedClassName: string;
}> = [
  {
    value: null,
    label: "Unreviewed",
    icon: Circle,
    selectedClassName: "bg-secondary text-primary ring-secondary",
  },
  {
    value: "preferred",
    label: "Preferred",
    icon: CircleDot,
    selectedClassName: "bg-success-primary text-success-primary ring-secondary",
  },
  {
    value: "keep",
    label: "Keep",
    icon: Check,
    selectedClassName: "bg-warning-primary text-warning-primary ring-secondary",
  },
  {
    value: "remove",
    label: "Remove",
    icon: X,
    selectedClassName: "bg-error-primary text-error-primary ring-error_subtle",
  },
];

const filterChoices: ReadonlyArray<{
  value: ComponentReviewFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "preferred", label: "Preferred" },
  { value: "keep", label: "Keep" },
  { value: "remove", label: "Remove" },
];

const sourceChoices: ReadonlyArray<{
  value: ComponentReviewSourceFilter;
  label: string;
}> = [
  { value: "all", label: "All sources" },
  { value: "untitled", label: "Untitled UI" },
  { value: "reui", label: "ReUI" },
  { value: "coursemap", label: "Coursemap" },
];

export const reviewSourceLabels: Record<ComponentReviewSource, string> = {
  untitled: "Untitled UI",
  reui: "ReUI",
  coursemap: "Coursemap",
};

function isDecisionFilter(
  value: string | null,
): value is ComponentReviewFilter {
  return filterChoices.some((choice) => choice.value === value);
}

function isSourceFilter(
  value: string | null,
): value is ComponentReviewSourceFilter {
  return sourceChoices.some((choice) => choice.value === value);
}

export function useReviewFilters() {
  const searchParams = useSearchParams();
  const decisionValue = searchParams.get("decision");
  const sourceValue = searchParams.get("source");
  return {
    decisionFilter: isDecisionFilter(decisionValue) ? decisionValue : "all",
    sourceFilter: isSourceFilter(sourceValue) ? sourceValue : "all",
  } as const;
}

export function ReviewDecisionControl({ item }: { item: ComponentReviewItem }) {
  const { decisions, saveStatus, setDecision } = useComponentReview();
  const selected = decisions[item.id]?.decision;
  const disabled = saveStatus === "loading";

  return (
    <div
      role="radiogroup"
      aria-label={`Review decision for ${item.title}`}
      className="grid w-full grid-cols-2 gap-1 rounded-lg bg-secondary p-1 ring-1 ring-secondary ring-inset sm:flex sm:w-auto"
    >
      {decisionChoices.map(
        ({ value, label, icon: Icon, selectedClassName }) => {
          const checked =
            selected === undefined ? value === null : selected === value;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => setDecision(item, value)}
              className={cx(
                "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold whitespace-nowrap outline-focus-ring transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60",
                checked
                  ? `${selectedClassName} shadow-xs ring-1 ring-inset`
                  : "text-quaternary hover:bg-primary hover:text-secondary",
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {label}
            </button>
          );
        },
      )}
    </div>
  );
}

function FilterButtons<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-secondary p-1 ring-1 ring-secondary ring-inset"
    >
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          role="radio"
          aria-checked={value === choice.value}
          onClick={() => onChange(choice.value)}
          className={cx(
            "min-h-10 cursor-pointer rounded-md px-3 text-sm font-semibold whitespace-nowrap outline-focus-ring transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2",
            value === choice.value
              ? "bg-primary text-secondary shadow-xs ring-1 ring-primary ring-inset"
              : "text-quaternary hover:text-secondary",
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

export function ReviewToolbar() {
  const { decisions, items, saveStatus, error } = useComponentReview();
  const { decisionFilter, sourceFilter } = useReviewFilters();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewed = items.filter((item) => decisions[item.id]).length;
  const visible = items.filter((item) =>
    componentMatchesReviewFilters(
      item,
      decisions[item.id]?.decision,
      decisionFilter,
      sourceFilter,
    ),
  ).length;

  function replaceFilter(key: "decision" | "source", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function focusNextUnreviewed() {
    const next = document.querySelector<HTMLElement>(
      '[data-review-decision="unreviewed"]',
    );
    next?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => next?.focus({ preventScroll: true }), 350);
  }

  return (
    <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-xl border border-secondary bg-primary/95 p-3 shadow-lg backdrop-blur md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">
            {reviewed} of {items.length} reviewed
          </p>
          <p className="text-xs text-tertiary">{visible} currently shown</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={cx(
              "flex min-h-9 items-center gap-1.5 text-xs font-semibold",
              saveStatus === "error" ? "text-error-primary" : "text-tertiary",
            )}
            role="status"
          >
            {saveStatus === "loading" && (
              <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
            )}
            {saveStatus === "saving" && (
              <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
            )}
            {saveStatus === "loading"
              ? "Loading review"
              : saveStatus === "saving"
                ? "Saving"
                : saveStatus === "error"
                  ? error
                  : "Saved locally"}
          </span>
          <button
            type="button"
            onClick={focusNextUnreviewed}
            className="min-h-10 cursor-pointer rounded-lg bg-primary px-3 text-sm font-semibold text-secondary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Next unreviewed
          </button>
          <Link
            href="/design-system/review"
            className="flex min-h-10 items-center rounded-lg bg-brand-solid px-3 text-sm font-semibold text-white shadow-xs outline-focus-ring hover:bg-brand-solid_hover focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Review summary
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <FilterButtons
          label="Filter by review decision"
          choices={filterChoices}
          value={decisionFilter}
          onChange={(value) => replaceFilter("decision", value)}
        />
        <FilterButtons
          label="Filter by component source"
          choices={sourceChoices}
          value={sourceFilter}
          onChange={(value) => replaceFilter("source", value)}
        />
      </div>
    </div>
  );
}
