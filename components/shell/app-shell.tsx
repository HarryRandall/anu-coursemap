"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export type AppShellProps = {
  children: ReactNode;
  actions?: ReactNode;
  /** Section tab links rendered in a full-width bar below the breadcrumbs. */
  tabs?: ReactNode;
  /** Replaces the final generated breadcrumb label when the route needs richer context. */
  currentBreadcrumbLabel?: string;
  /** Relabels generated path segments, or hides them when their value is null. */
  breadcrumbSegmentLabels?: Record<string, string | null>;
  admin?: boolean;
  /** Makes the main region a flex column so one child can claim the rest of the viewport. */
  fill?: boolean;
  /** Removes the default page padding + max width (used by the plan board). */
  fullBleed?: boolean;
};

export function AppShell({
  children,
  actions,
  tabs,
  currentBreadcrumbLabel,
  breadcrumbSegmentLabels,
  admin = false,
  fill = false,
  fullBleed = false,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className={cn(
        "min-h-dvh bg-white",
        // A filled page is exactly one viewport tall and scrolls nothing at
        // the document level, so no OS scrollbar is drawn over the window
        // edge. Narrow screens keep scrolling the page, which is what a
        // thumb expects.
        fill && "md:h-dvh md:min-h-0 md:overflow-hidden",
      )}
    >
      <Sidebar
        admin={admin}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "min-w-0 lg:pl-64",
          fill && "md:flex md:h-full md:flex-col",
        )}
      >
        <Topbar
          actions={actions}
          breadcrumbSegmentLabels={breadcrumbSegmentLabels}
          currentBreadcrumbLabel={currentBreadcrumbLabel}
          onOpenNav={() => setMobileOpen(true)}
        />
        {tabs && (
          <div
            className={cn(
              "border-b border-zinc-200 bg-white px-4 sm:px-6",
              fill && "md:shrink-0",
            )}
          >
            <nav aria-label="Page sections" className="flex items-center gap-1">
              {tabs}
            </nav>
          </div>
        )}
        <main
          className={cn(
            "min-h-[calc(100dvh-4rem)] w-full max-w-none min-w-0 bg-zinc-50/60",
            !fullBleed && "px-4 py-6 sm:px-6 sm:py-7",
            // Lets a page hand its remaining height to one scrolling child,
            // such as a directory table that should reach the viewport floor.
            fill && "flex flex-col md:min-h-0 md:flex-1 md:overflow-hidden",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
