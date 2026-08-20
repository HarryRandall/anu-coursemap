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
  admin?: boolean;
  /** Removes the default page padding + max width (used by the plan board). */
  fullBleed?: boolean;
};

export function AppShell({
  children,
  actions,
  tabs,
  admin = false,
  fullBleed = false,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-white">
      <Sidebar
        admin={admin}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="min-w-0 lg:pl-64">
        <Topbar actions={actions} onOpenNav={() => setMobileOpen(true)} />
        {tabs && (
          <div className="border-b border-zinc-200 bg-white px-4 sm:px-6">
            <nav aria-label="Page sections" className="flex items-center gap-1">
              {tabs}
            </nav>
          </div>
        )}
        <main
          className={cn(
            "min-h-[calc(100dvh-4rem)] w-full max-w-none min-w-0 bg-zinc-50/60",
            !fullBleed && "px-4 py-6 sm:px-6 sm:py-7",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
