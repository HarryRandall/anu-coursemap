"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function useDialogState(onClose: () => void) {
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  return {
    onOpenChange(open: boolean) {
      if (!open) onClose();
    },
    onCloseAutoFocus(event: Event) {
      event.preventDefault();
      opener.current?.focus();
    },
  };
}

/** Compatibility wrapper for conditionally mounted centred dialogs. */
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
  const state = useDialogState(onClose);

  return (
    <Dialog open onOpenChange={state.onOpenChange}>
      <DialogContent
        aria-labelledby={labelledBy}
        align={align}
        showCloseButton={false}
        onCloseAutoFocus={state.onCloseAutoFocus}
        className={cn("max-w-lg", className)}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Compatibility wrapper for conditionally mounted right-hand sheets. */
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
  const state = useDialogState(onClose);

  return (
    <Sheet open onOpenChange={state.onOpenChange}>
      <SheetContent
        aria-labelledby={labelledBy}
        showCloseButton={false}
        onCloseAutoFocus={state.onCloseAutoFocus}
        className={className}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
