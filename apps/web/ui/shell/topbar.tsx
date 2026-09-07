"use client";

import type { ReactNode } from "react";
import { Separator } from "@coursemap/ui/primitives/separator";
import { SidebarTrigger } from "@coursemap/ui/primitives/sidebar";
import { Breadcrumbs } from "@/ui/shell/breadcrumbs";
import { ThemeToggle } from "@/ui/shell/theme-toggle";

export function Topbar({
  showThemeToggle = true,
  actions,
  currentBreadcrumbLabel,
  breadcrumbSegmentLabels,
  breadcrumbTrailingLabel,
}: {
  showThemeToggle?: boolean;
  actions?: ReactNode;
  currentBreadcrumbLabel?: string;
  breadcrumbSegmentLabels?: Record<string, string | null>;
  breadcrumbTrailingLabel?: string;
}) {
  return (
    <header className="relative flex min-h-14 flex-wrap items-center justify-between gap-2 overflow-visible border-b border-border bg-background px-4 py-2 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
      <div className="flex min-w-0 items-center gap-2 overflow-visible">
        <SidebarTrigger className="shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-1 hidden sm:block data-vertical:h-4 data-vertical:self-center"
        />
        <Breadcrumbs
          currentLabel={currentBreadcrumbLabel}
          segmentLabels={breadcrumbSegmentLabels}
          trailingLabel={breadcrumbTrailingLabel}
        />
      </div>

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        {actions}
        {showThemeToggle && <ThemeToggle />}
      </div>
    </header>
  );
}
