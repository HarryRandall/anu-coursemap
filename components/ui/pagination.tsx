import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

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

  return (
    <nav
      aria-label={`${itemName} pagination`}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-zinc-500">
        {total === 0
          ? `No ${itemName}`
          : `Showing ${start.toLocaleString("en-AU")}-${end.toLocaleString("en-AU")} of ${total.toLocaleString("en-AU")} ${itemName}`}
      </p>
      <div className="flex items-center gap-2">
        {safePage > 1 ? (
          <Link
            href={pageHref({
              pathname,
              searchParams,
              page: safePage - 1,
            })}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <ChevronLeft size={14} aria-hidden="true" /> Previous
          </Link>
        ) : (
          <span
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className: "pointer-events-none opacity-50",
            })}
          >
            <ChevronLeft size={14} aria-hidden="true" /> Previous
          </span>
        )}
        <span className="text-xs text-zinc-500 tabular-nums">
          Page {safePage} of {pageCount}
        </span>
        {safePage < pageCount ? (
          <Link
            href={pageHref({
              pathname,
              searchParams,
              page: safePage + 1,
            })}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Next <ChevronRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          <span
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className: "pointer-events-none opacity-50",
            })}
          >
            Next <ChevronRight size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
