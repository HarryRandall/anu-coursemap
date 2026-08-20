"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogTrigger(
  props: ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(
  props: ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[100] animate-fade-in bg-zinc-950/40 backdrop-blur-[3px] motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  align = "center",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  align?: "center" | "top";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <div
        className={cn(
          "fixed inset-0 z-[100] grid p-4 sm:p-6",
          align === "top"
            ? "place-items-start pt-[8dvh]"
            : "place-items-center",
        )}
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "relative flex max-h-[calc(100dvh-2rem)] w-full animate-modal-in flex-col overflow-hidden rounded-2xl bg-white text-sm text-zinc-900 shadow-lg ring-1 ring-zinc-200 outline-none motion-reduce:animate-none sm:max-h-[calc(100dvh-3rem)]",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              aria-label="Close"
              title="Close"
              className="absolute top-3 right-3 z-10 inline-grid size-11 place-items-center rounded-lg bg-white text-zinc-500 shadow-xs ring-1 ring-zinc-200 transition ring-inset hover:bg-zinc-50 hover:text-zinc-800 hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            >
              <X size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-xl leading-tight font-bold tracking-tight text-zinc-950",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm leading-relaxed text-zinc-500", className)}
      {...props}
    />
  );
}
