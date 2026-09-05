"use client";

import type { ReactNode } from "react";
import { Separator } from "@reui/ui/separator";
import { SidebarTrigger } from "@reui/ui/sidebar";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export function Topbar({
  actions,
  currentBreadcrumbLabel,
  breadcrumbSegmentLabels,
}: {
  actions?: ReactNode;
  currentBreadcrumbLabel?: string;
  breadcrumbSegmentLabels?: Record<string, string | null>;
}) {
  return (
    <header className="relative flex min-h-14 flex-wrap items-center justify-between gap-2 overflow-visible border-b border-border bg-background px-4 py-2 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
      <div className="flex min-w-0 items-center gap-2 overflow-visible">
        <SidebarTrigger className="shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-1 hidden data-[orientation=vertical]:h-4 sm:block"
        />
        <Breadcrumbs
          currentLabel={currentBreadcrumbLabel}
          segmentLabels={breadcrumbSegmentLabels}
        />
      </div>

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
