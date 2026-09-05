"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@reui/ui/sidebar";
import { cn } from "@/lib/cn";
import { AppSidebar } from "@/components/shell/app-sidebar";
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
  return (
    <SidebarProvider
      className={cn(
        // A filled page is exactly one viewport tall and scrolls nothing at
        // the document level, so no OS scrollbar is drawn over the window
        // edge. Narrow screens keep scrolling the page, which is what a
        // thumb expects.
        fill && "md:h-dvh md:min-h-0 md:overflow-hidden",
      )}
    >
      <AppSidebar admin={admin} />

      <SidebarInset
        className={cn("min-w-0", fill && "md:h-full md:min-h-0 md:overflow-hidden")}
      >
        <Topbar
          actions={actions}
          breadcrumbSegmentLabels={breadcrumbSegmentLabels}
          currentBreadcrumbLabel={currentBreadcrumbLabel}
        />
        {tabs && (
          <div
            className={cn(
              "border-border bg-background border-b px-4 sm:px-6",
              fill && "md:shrink-0",
            )}
          >
            <nav aria-label="Page sections" className="flex items-center gap-1">
              {tabs}
            </nav>
          </div>
        )}
        <div
          className={cn(
            "bg-muted/40 dark:bg-transparent min-h-[calc(100dvh-4rem)] w-full max-w-none min-w-0",
            !fullBleed && "px-4 py-6 sm:px-6 sm:py-7",
            // Lets a page hand its remaining height to one scrolling child,
            // such as a directory table that should reach the viewport floor.
            fill && "flex flex-col md:min-h-0 md:flex-1 md:overflow-hidden",
          )}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
