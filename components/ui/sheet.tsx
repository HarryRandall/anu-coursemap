"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { DialogOverlay } from "@/components/ui/dialog";

export function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetTrigger(
  props: ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(
  props: ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

export function SheetContent({
  className,
  children,
  showCloseButton = true,
  side = "right",
  overlayClassName,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  side?: "left" | "right";
  overlayClassName?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className={cn("bg-zinc-950/35", overlayClassName)} />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-[100] flex h-dvh w-full max-w-md flex-col bg-white text-sm text-zinc-950 shadow-lg outline-none motion-reduce:animate-none",
          side === "right"
            ? "right-0 border-l border-zinc-200 data-[state=closed]:animate-drawer-out-right data-[state=open]:animate-drawer-in-right"
            : "left-0 border-r border-zinc-200 data-[state=closed]:animate-drawer-out-left data-[state=open]:animate-drawer-in-left",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            aria-label="Close"
            title="Close"
            className="absolute top-3 right-3 z-10 inline-grid size-10 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-xs transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:outline-none"
          >
            <X size={17} aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-5", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex items-center gap-2 border-t border-zinc-100 p-4",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm leading-relaxed text-zinc-500", className)}
      {...props}
    />
  );
}
