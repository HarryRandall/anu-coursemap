"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo } from "react";
import type { ReuiCatalogueCategory } from "./catalogue-data/catalogue.generated";
import { ReuiCataloguePreviewFrame } from "./catalogue-preview-frame";

function updateQueryString(
  searchParams: URLSearchParams,
  updates: Record<string, string>,
) {
  const next = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next.toString();
}

function fullPreviewHeight(previewHeight?: string) {
  const suggestedHeight = Number(previewHeight);
  return Number.isFinite(suggestedHeight)
    ? Math.max(suggestedHeight, 520)
    : 520;
}

export function ReuiCatalogueBrowser({
  categories,
  total,
}: {
  categories: readonly ReuiCatalogueCategory[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => {
        if (!deferredQuery) return { category, examples: category.examples };

        const categoryMatches =
          category.label.toLowerCase().includes(deferredQuery) ||
          category.description.toLowerCase().includes(deferredQuery);
        const matchingExamples = category.examples.filter(
          (example) =>
            example.title.toLowerCase().includes(deferredQuery) ||
            example.description.toLowerCase().includes(deferredQuery) ||
            example.name.toLowerCase().includes(deferredQuery),
        );

        return {
          category,
          examples: categoryMatches ? category.examples : matchingExamples,
        };
      })
      .filter(({ examples }) => examples.length > 0);
  }, [categories, deferredQuery]);

  const filteredTotal = filteredCategories.reduce(
    (sum, { examples }) => sum + examples.length,
    0,
  );

  function replaceSearch(updates: Record<string, string>) {
    const queryString = updateQueryString(searchParams, updates);
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-tertiary text-sm">
          <span className="font-semibold text-primary">
            {filteredTotal.toLocaleString("en-AU")}
          </span>{" "}
          {deferredQuery ? `of ${total.toLocaleString("en-AU")}` : "free"}{" "}
          examples across {filteredCategories.length} families
        </p>
        <label className="relative block w-full xl:max-w-sm">
          <span className="sr-only">Search free ReUI examples</span>
          <Search
            aria-hidden="true"
            className="text-fg-quaternary pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => replaceSearch({ q: event.target.value })}
            placeholder="Search 1,105 examples"
            className="outline-focus-ring placeholder:text-placeholder focus:border-brand min-h-13 w-full rounded-xl border border-secondary bg-primary pr-4 pl-11 text-sm text-primary shadow-xs focus:outline-2 focus:outline-offset-1"
          />
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {filteredTotal} examples across {filteredCategories.length} component
        families shown.
      </p>

      {filteredCategories.length > 0 ? (
        <div className="flex flex-col gap-12">
          {filteredCategories.map(({ category, examples }) => (
            <section
              key={category.name}
              id={category.name}
              className="scroll-mt-6"
            >
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-secondary pb-3">
                <h2 className="text-display-xs font-semibold text-primary">
                  {category.label}
                </h2>
                <span className="text-tertiary shrink-0 text-sm">
                  {examples.length}{" "}
                  {examples.length === 1 ? "example" : "examples"}
                </span>
              </div>

              <div className="flex flex-col gap-6">
                {examples.map((example) => (
                  <article
                    key={example.name}
                    className="w-full overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs"
                  >
                    <div className="border-b border-secondary">
                      <ReuiCataloguePreviewFrame
                        category={category.name}
                        example={example.name}
                        title={example.title}
                        interactive
                        virtualised
                        themeControl
                        height={fullPreviewHeight(example.previewHeight)}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
                      <div className="min-w-0">
                        <h3 className="text-md font-semibold text-primary">
                          {example.title}
                        </h3>
                        <p className="text-quaternary mt-0.5 truncate font-mono text-xs">
                          {example.name}
                        </p>
                      </div>
                      <span className="bg-brand-primary text-brand-secondary shrink-0 rounded-md px-2 py-1 text-xs font-semibold">
                        ReUI
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-secondary bg-primary p-8 text-center">
          <Search aria-hidden="true" className="text-fg-quaternary size-6" />
          <p className="text-md font-semibold text-primary">
            No examples found
          </p>
          <p className="text-tertiary text-sm">
            Try a component name, behaviour or use case.
          </p>
        </div>
      )}
    </div>
  );
}
