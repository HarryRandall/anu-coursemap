"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@reui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@reui/ui/dialog";

export function AnuSourceDialog({
  title,
  texts,
  sourceUrl,
}: {
  title: string;
  texts: string[];
  sourceUrl?: string | null;
}) {
  const excerpts = [
    ...new Set(texts.map((text) => text.trim()).filter(Boolean)),
  ];
  if (!excerpts.length) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" type="button">
          ANU text
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 overflow-hidden p-5 sm:max-w-lg">
        <DialogHeader className="gap-1.5 pr-7">
          <DialogTitle>Original ANU text</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto rounded-lg bg-muted/40 p-4">
          <div className="space-y-4">
            {excerpts.map((text, index) => (
              <p
                className="text-sm leading-6 break-words whitespace-pre-wrap text-foreground/90"
                key={index}
              >
                {text}
              </p>
            ))}
          </div>
        </div>
        {sourceUrl ? (
          <footer className="flex shrink-0 justify-end border-t border-border pt-3">
            <Button asChild variant="ghost" size="sm">
              <a href={sourceUrl} rel="noreferrer" target="_blank">
                View on ANU
                <ExternalLink aria-hidden="true" size={14} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </footer>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
