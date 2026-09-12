import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coursemap/ui/primitives/empty";
import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/cn";

export function DataTableShell({
  children,
  className,
  footer,
  viewport = false,
}: {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  viewport?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs",
        viewport && "min-h-0 md:flex md:flex-1 md:flex-col",
        className,
      )}
    >
      <div
        className={cn(
          // rounded-[inherit] keeps the scroll container's painted backgrounds
          // inside the shell's corners rather than squaring them off.
          "relative isolate min-h-0 overflow-x-auto overscroll-x-contain rounded-[inherit]",
          // Owns the vertical scroll on wide screens, so the document itself
          // never scrolls. The toolbar and the sticky column headers stay put
          // however far down the list you are, and the only scrollbar is this
          // one — inside the card, where styling it costs no page width.
          viewport && "md:flex-1 md:overflow-y-auto md:overscroll-y-contain",
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-border/80 bg-muted/30 px-4 py-2.5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function DataTableEmpty({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <Empty className="py-9">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <SearchX />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}
