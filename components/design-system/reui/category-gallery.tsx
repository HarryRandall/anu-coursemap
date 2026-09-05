"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue } from "react";
import type { ReuiCatalogueCategory } from "./catalogue-data/catalogue.generated";
import { ReuiCataloguePreviewFrame } from "./catalogue-preview-frame";

function fullPreviewHeight(previewHeight?: string) {
  const suggestedHeight = Number(previewHeight);
  return Number.isFinite(suggestedHeight)
    ? Math.max(suggestedHeight, 520)
    : 520;
}

export function ReuiCategoryGallery({
  category,
}: {
  category: ReuiCatalogueCategory;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const examples = deferredQuery
    ? category.examples.filter(
        (example) =>
          example.title.toLowerCase().includes(deferredQuery) ||
          example.description.toLowerCase().includes(deferredQuery) ||
          example.name.toLowerCase().includes(deferredQuery),
      )
    : category.examples;

  function setQuery(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Search {category.label} examples</span>
          <Search
            aria-hidden="true"
            className="text-fg-quaternary pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${category.count} examples`}
            className="outline-focus-ring placeholder:text-placeholder focus:border-brand min-h-12 w-full rounded-xl border border-secondary bg-primary pr-4 pl-11 text-sm text-primary shadow-xs focus:outline-2 focus:outline-offset-1"
          />
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {examples.length} examples shown.
      </p>

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
                <h2 className="text-md font-semibold text-primary">
                  {example.title}
                </h2>
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
    </div>
  );
}
