"use client";

import type { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
} from "@coursemap/ui/primitives/sidebar";
import { cn } from "@/lib/cn";
import { AppSidebar } from "@/ui/shell/app-sidebar";
import { useSidebarDefaultOpen } from "@/ui/shell/sidebar-preference";
import { Topbar } from "@/ui/shell/topbar";

export type AppShellProps = {
  children: ReactNode;
  showThemeToggle?: boolean;
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
  showThemeToggle = true,
  actions,
  tabs,
  currentBreadcrumbLabel,
  breadcrumbSegmentLabels,
  admin = false,
  fill = false,
  fullBleed = false,
}: AppShellProps) {
  const { open, setOpen } = useSidebarDefaultOpen();
  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
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
        className={cn(
          "min-w-0",
          fill && "md:h-full md:min-h-0 md:overflow-hidden",
        )}
      >
        <Topbar
          showThemeToggle={showThemeToggle}
          actions={actions}
          breadcrumbSegmentLabels={breadcrumbSegmentLabels}
          currentBreadcrumbLabel={currentBreadcrumbLabel}
        />
        {tabs && (
          <div
            className={cn(
              "border-b border-border bg-background px-4 sm:px-6",
              fill && "md:shrink-0",
            )}
          >
            <nav
              aria-label="Page sections"
              className="flex min-w-0 items-center overflow-x-auto overflow-y-hidden"
            >
              {tabs}
            </nav>
          </div>
        )}
        <div
          className={cn(
            "min-h-[calc(100dvh-4rem)] w-full max-w-none min-w-0 bg-muted/40 dark:bg-transparent",
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
