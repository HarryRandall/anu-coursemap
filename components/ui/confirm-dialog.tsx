"use client";

import { TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Confirmation for an action a reviewer cannot undo with a single click.
 * The description says what actually happens rather than asking "are you
 * sure", so the decision is made on facts.
 */
export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  destructive = false,
  onConfirm,
  open,
  onOpenChange,
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
  title: string;
  trigger?: ReactNode;
}) {
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
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader className="p-5">
          <div className="flex gap-3">
            {destructive ? (
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-600"
              >
                <TriangleAlert size={17} />
              </span>
            ) : null}
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="text-base font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-6">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="px-5 py-3.5">
          <Button onClick={() => onOpenChange?.(false)} size="sm" type="button">
            {cancelLabel}
          </Button>
          <Button
            disabled={pending}
            onClick={confirm}
            size="sm"
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
