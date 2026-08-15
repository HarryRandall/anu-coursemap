"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";

export function Topbar({
  actions,
  onOpenNav,
}: {
  actions?: ReactNode;
  onOpenNav: () => void;
}) {
  return (
    <header className="relative flex min-h-14 items-center justify-between gap-3 bg-white px-4 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-zinc-200 after:content-[''] sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenNav}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <Breadcrumbs />
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
