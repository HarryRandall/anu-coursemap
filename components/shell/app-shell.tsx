"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SearchDialog } from "@/components/search-dialog";

export type AppShellProps = {
  children: ReactNode;
  /** Kept for page-level context; navigation now uses breadcrumbs. */
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  admin?: boolean;
  /** Removes the default page padding + max width (used by the plan board). */
  fullBleed?: boolean;
};

export function AppShell({
  children,
  actions,
  admin = false,
  fullBleed = false,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (admin) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [admin]);

  return (
    <div className="min-h-dvh bg-white">
      <Sidebar
        admin={admin}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <div className="min-w-0 lg:pl-64">
        <Topbar actions={actions} onOpenNav={() => setMobileOpen(true)} />
        <main
          className={cn(
            "min-h-[calc(100dvh-4rem)] w-full max-w-none min-w-0 bg-zinc-50/60",
            !fullBleed && "px-4 py-6 sm:px-6 sm:py-7",
          )}
        >
          {children}
        </main>
      </div>

      {!admin && searchOpen && (
        <SearchDialog onClose={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
