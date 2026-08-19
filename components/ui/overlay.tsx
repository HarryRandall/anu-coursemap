"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

/**
 * Shared Radix Dialog wiring for overlays that are conditionally rendered by
 * their callers: the dialog is always open while mounted and any dismissal
 * (Escape, outside press or programmatic close) is reported through onClose.
 */
function OverlayRoot({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Centred modal dialog. Label it with labelledBy pointing at a heading. */
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
  return (
    <OverlayRoot onClose={onClose}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] animate-fade-in bg-zinc-950/45 backdrop-blur-[3px]" />
      <div
        className={cn(
          "fixed inset-0 z-[100] grid p-4 sm:p-6",
          align === "top" ? "place-items-start pt-[8vh]" : "place-items-center",
        )}
      >
        <DialogPrimitive.Content
          aria-labelledby={labelledBy}
          className={cn(
            "relative flex max-h-[calc(100dvh-3rem)] w-full animate-modal-in flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-zinc-200 outline-none",
            className,
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </div>
    </OverlayRoot>
  );
}

/** Right-hand slide-over drawer. Label it with labelledBy pointing at a heading. */
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
  return (
    <OverlayRoot onClose={onClose}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] animate-fade-in bg-zinc-950/35 backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        aria-labelledby={labelledBy}
        className={cn(
          "fixed inset-y-0 right-0 z-[100] flex h-dvh w-full animate-drawer-in flex-col bg-white shadow-lg ring-1 ring-zinc-200 outline-none sm:w-[440px]",
          className,
        )}
      >
        {children}
      </DialogPrimitive.Content>
    </OverlayRoot>
  );
}
