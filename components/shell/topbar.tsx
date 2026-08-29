"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { IconButton } from "@/components/ui/button";

export function Topbar({
  actions,
  currentBreadcrumbLabel,
  onOpenNav,
}: {
  actions?: ReactNode;
  currentBreadcrumbLabel?: string;
  onOpenNav: () => void;
}) {
  return (
    <header className="relative flex min-h-14 flex-wrap items-center justify-between gap-2 overflow-visible bg-white px-4 py-2 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-zinc-200 after:content-[''] sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
      <div className="flex min-w-0 items-center gap-2 overflow-visible">
        <IconButton
          id="mobile-navigation-trigger"
          label="Open navigation"
          variant="ghost"
          onClick={onOpenNav}
          className="shrink-0 lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </IconButton>
        <Breadcrumbs currentLabel={currentBreadcrumbLabel} />
      </div>

      {actions && (
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
