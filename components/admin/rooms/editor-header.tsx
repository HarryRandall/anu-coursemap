"use client";

import { LoaderCircle, Redo2, Save, Send, Undo2 } from "lucide-react";
import { useId, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";

/**
 * Compact document actions for the application top bar. The breadcrumb owns
 * navigation and identity; the map name is only needed while saving.
 */
export function EditorActions({
  currentStatus,
  name,
  savingStatus,
  canUndo,
  canRedo,
  publishBlocked,
  onUndo,
  onRedo,
  onSave,
}: {
  currentStatus: "draft" | "published";
  name: string;
  savingStatus: "draft" | "published" | null;
  canUndo: boolean;
  canRedo: boolean;
  publishBlocked: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onSave: (status: "draft" | "published", name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<"draft" | "published">("draft");
  const [draftName, setDraftName] = useState(name);
  const publishBlockedId = useId();

  function openSave(nextIntent: "draft" | "published") {
    setIntent(nextIntent);
    setDraftName(name);
    setOpen(true);
  }

  const saveIntent =
    currentStatus === "published" && publishBlocked === null
      ? "published"
      : "draft";
  const confirmingPublished = intent === "published";
  const confirmLabel = confirmingPublished
    ? currentStatus === "published"
      ? "Save changes"
      : "Publish"
    : "Save draft";

  return (
    <>
      <IconButton
        className="size-11 sm:size-8"
        disabled={!canUndo}
        label="Undo"
        onClick={onUndo}
        size="icon-sm"
        variant="ghost"
      >
        <Undo2 aria-hidden="true" />
      </IconButton>
      <IconButton
        className="size-11 sm:size-8"
        disabled={!canRedo}
        label="Redo"
        onClick={onRedo}
        size="icon-sm"
        variant="ghost"
      >
        <Redo2 aria-hidden="true" />
      </IconButton>
      <Button
        aria-label="Save indoor map"
        className="h-11 px-3 sm:h-8"
        disabled={savingStatus !== null}
        onClick={() => openSave(saveIntent)}
        size="sm"
      >
        {savingStatus !== null ? (
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Save aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Save</span>
      </Button>
      <Button
        aria-describedby={publishBlocked ? publishBlockedId : undefined}
        aria-disabled={savingStatus !== null || publishBlocked !== null}
        aria-label="Publish indoor map"
        className="h-11 px-3 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:h-8"
        onClick={() => {
          if (savingStatus === null && publishBlocked === null) {
            openSave("published");
          }
        }}
        size="sm"
        title={publishBlocked ?? undefined}
        variant="primary"
      >
        <Send aria-hidden="true" />
        <span className="hidden sm:inline">Publish</span>
      </Button>
      {publishBlocked ? (
        <span
          aria-live="polite"
          className="sr-only"
          id={publishBlockedId}
          role="status"
        >
          Publishing is unavailable. {publishBlocked}
        </span>
      ) : null}

      <Dialog
        onOpenChange={(nextOpen) => {
          if (savingStatus === null) setOpen(nextOpen);
        }}
        open={open}
      >
        <DialogContent className="max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave(intent, draftName.trim());
              setOpen(false);
            }}
          >
            <DialogHeader className="px-5 pt-5 pr-16">
              <DialogTitle>{confirmLabel}</DialogTitle>
              <DialogDescription>
                Confirm the indoor map name for this building.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 py-4">
              <Field label="Map name">
                <Input
                  autoFocus
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Indoor map name"
                  required
                  value={draftName}
                />
              </Field>
              {confirmingPublished && publishBlocked ? (
                <p
                  className="mt-3 text-xs leading-5 text-rose-700"
                  role="alert"
                >
                  {publishBlocked}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  className="h-11 sm:h-8"
                  disabled={savingStatus !== null}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="h-11 sm:h-8"
                disabled={
                  savingStatus !== null ||
                  !draftName.trim() ||
                  (confirmingPublished && publishBlocked !== null)
                }
                type="submit"
                variant="primary"
              >
                {savingStatus !== null ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : confirmingPublished ? (
                  <Send aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
