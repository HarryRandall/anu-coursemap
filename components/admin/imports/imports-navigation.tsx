import Link from "next/link";
import { cn } from "@/lib/cn";

type ImportsView = "overview" | "activity" | "history";

const links: Array<{ href: string; label: string; view: ImportsView }> = [
  { href: "/admin/sync", label: "Overview", view: "overview" },
  { href: "/admin/sync/activity", label: "Activity", view: "activity" },
  {
    href: "/admin/sync/history",
    label: "Historical changes",
    view: "history",
  },
];

export function ImportsNavigation({
  active,
  historicalCount = 0,
}: {
  active: ImportsView;
  historicalCount?: number;
}) {
  return (
    <>
      {links.map((link) => {
        const current = link.view === active;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 items-center gap-2 px-3 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950",
              current &&
                "text-zinc-950 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600",
            )}
          >
            {link.label}
            {link.view === "history" && historicalCount > 0 ? (
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums">
                {historicalCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
