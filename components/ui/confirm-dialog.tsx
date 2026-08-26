"use client";

import { TriangleAlert, X } from "lucide-react";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Confirmation for an action with broad visibility or data impact. The
 * description says what actually happens so the decision is made on facts.
 */
export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  destructive = false,
  onConfirm,
  open,
  onOpenChange,
  returnFocusRef,
  title,
  trigger,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  title: string;
  trigger?: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange?.(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="max-w-[25rem]"
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current
            ?.querySelector<HTMLButtonElement>("[data-confirm-cancel]")
            ?.focus();
        }}
        overlayClassName="bg-zinc-950/25 backdrop-blur-[1px]"
        ref={contentRef}
        showCloseButton={false}
      >
        <DialogClose
          aria-label="Close"
          className="absolute top-2.5 right-2.5 z-10 grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
          title="Close"
        >
          <X aria-hidden="true" size={17} />
        </DialogClose>
        <DialogHeader className="gap-2 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 pr-9">
            {destructive ? (
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-600"
              >
                <TriangleAlert size={16} />
              </span>
            ) : null}
            <DialogTitle className="min-w-0 text-base font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-5">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t-0 bg-white px-5 pt-0 pb-4">
          <Button
            data-confirm-cancel
            onClick={() => onOpenChange?.(false)}
            type="button"
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={pending}
            onClick={confirm}
            type="button"
            variant={destructive ? "danger" : "primary"}
          >
            {pending ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
