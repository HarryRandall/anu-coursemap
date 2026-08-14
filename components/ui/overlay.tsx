"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Close on Escape + lock body scroll while an overlay is open. */
export function useDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
}

function Scrim({
  onClose,
  label,
  className,
}: {
  onClose: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className={cn(
        "absolute inset-0 h-full w-full animate-fade-in cursor-default bg-zinc-950/45 backdrop-blur-[3px]",
        className,
      )}
    />
  );
}

/** Centred modal dialog. */
export function Modal({
  onClose,
  labelledBy,
  className,
  children,
  align = "center",
}: {
  onClose: () => void;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
  align?: "center" | "top";
}) {
  useDismiss(onClose);
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] grid p-4 sm:p-6",
        align === "top" ? "place-items-start pt-[8vh]" : "place-items-center",
      )}
    >
      <Scrim onClose={onClose} label="Close dialog" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-3rem)] w-full animate-modal-in flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-zinc-200",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Right-hand slide-over drawer. */
export function Drawer({
  onClose,
  labelledBy,
  className,
  children,
}: {
  onClose: () => void;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  useDismiss(onClose);
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <Scrim onClose={onClose} label="Close panel" className="bg-zinc-950/35" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 flex h-dvh w-full animate-drawer-in flex-col bg-white shadow-lg ring-1 ring-zinc-200 sm:w-[440px]",
          className,
        )}
      >
        {children}
      </aside>
    </div>
  );
}
