import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

function pageHref({
  pathname,
  searchParams,
  page,
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
}) {
  const params = new URLSearchParams(
    Object.entries(searchParams).flatMap(([key, value]) =>
      value && key !== "page" ? [[key, value]] : [],
    ),
  );
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * First page, last page, and the current page with a neighbour either side.
 * Gaps become an ellipsis so the control keeps a fixed width as pages change.
 */
function pageWindow(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((left, right) => left - right);
  return visible.flatMap((value, index) =>
    index > 0 && value - visible[index - 1] > 1
      ? (["gap", value] as Array<number | "gap">)
      : [value],
  );
}

const stepClasses =
  "grid size-8 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none";

export function Pagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total,
  itemName,
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  itemName: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  const href = (target: number) =>
    pageHref({ pathname, searchParams, page: target });

  return (
    <nav
      aria-label={`${itemName} pagination`}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-zinc-500 tabular-nums">
        {total === 0
          ? `No ${itemName}`
          : `Viewing ${start.toLocaleString("en-AU")}–${end.toLocaleString("en-AU")} of ${total.toLocaleString("en-AU")} ${itemName}`}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-0.5">
          {safePage > 1 ? (
            <Link className={stepClasses} href={href(safePage - 1)}>
              <ChevronLeft aria-hidden="true" size={16} />
              <span className="sr-only">Previous page</span>
            </Link>
          ) : (
            <span className={cn(stepClasses, "text-zinc-300")}>
              <ChevronLeft aria-hidden="true" size={16} />
            </span>
          )}

          {pageWindow(safePage, pageCount).map((entry, index) =>
            entry === "gap" ? (
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center text-xs text-zinc-400"
                key={`gap-${index}`}
              >
                &hellip;
              </span>
            ) : entry === safePage ? (
              <span
                aria-current="page"
                className="grid size-8 place-items-center rounded-md bg-zinc-900 text-xs font-semibold text-white tabular-nums"
                key={entry}
              >
                {entry}
              </span>
            ) : (
              <Link
                className="grid size-8 place-items-center rounded-md text-xs font-medium text-zinc-600 tabular-nums transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                href={href(entry)}
                key={entry}
              >
                <span className="sr-only">Page </span>
                {entry}
              </Link>
            ),
          )}

          {safePage < pageCount ? (
            <Link className={stepClasses} href={href(safePage + 1)}>
              <ChevronRight aria-hidden="true" size={16} />
              <span className="sr-only">Next page</span>
            </Link>
          ) : (
            <span className={cn(stepClasses, "text-zinc-300")}>
              <ChevronRight aria-hidden="true" size={16} />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
