"use client";

import type { ReactNode } from "react";

export function ArtefactViewport({
  children,
  label,
  toolbar,
}: {
  children: ReactNode;
  label: string;
  toolbar?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          {toolbar}
        </div>
      ) : null}
      <div
        aria-label={label}
        role="region"
        tabIndex={0}
        className="max-h-[min(65vh,40rem)] overflow-auto overscroll-contain focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        {children}
      </div>
    </div>
  );
}
