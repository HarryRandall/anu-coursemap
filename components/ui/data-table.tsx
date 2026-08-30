import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
        "relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs",
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
        <div className="shrink-0 border-t border-zinc-200/80 bg-zinc-50/40 px-4 py-2.5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Table({
  className,
  ...rest
}: ComponentPropsWithoutRef<"table">) {
  return (
    <table
      data-slot="table"
      className={cn(
        "w-full caption-bottom border-collapse text-left text-sm",
        className,
      )}
      {...rest}
    />
  );
}

export function TableHeader({
  className,
  ...rest
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "border-b border-zinc-200/80 bg-zinc-50/80 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-zinc-50/95 [&_th]:backdrop-blur-sm",
        className,
      )}
      {...rest}
    />
  );
}

export function TableBody({
  className,
  ...rest
}: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-b-0", className)}
      {...rest}
    />
  );
}

export function TableRow({
  className,
  ...rest
}: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // A fixed row height keeps the table scannable: rows stay uniform
        // whether or not a cell carries a second line of detail.
        "h-16 border-b border-zinc-100 transition-colors hover:bg-zinc-50/70 motion-reduce:transition-none",
        className,
      )}
      {...rest}
    />
  );
}

export function TableHead({
  className,
  scope = "col",
  ...rest
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "h-10 px-4 text-left align-middle text-[11px] font-medium tracking-wide whitespace-nowrap text-zinc-500 uppercase",
        className,
      )}
      {...rest}
    />
  );
}

export function TableCell({
  className,
  ...rest
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-3 align-middle text-sm text-zinc-800", className)}
      {...rest}
    />
  );
}

export function TableCaption({
  className,
  ...rest
}: ComponentPropsWithoutRef<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("sr-only", className)}
      {...rest}
    />
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

export function tableClasses(className?: string) {
  return cn(
    "w-full min-w-[720px] caption-bottom border-collapse text-left text-sm",
    className,
  );
}

export function tableHeadClasses(className?: string) {
  return cn(
    "border-b border-zinc-200/80 bg-zinc-50/80 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-zinc-50/95 [&_th]:backdrop-blur-sm",
    className,
  );
}

export function tableHeaderCellClasses(className?: string) {
  return cn(
    "h-10 px-4 text-left align-middle text-[11px] font-medium tracking-wide whitespace-nowrap text-zinc-500 uppercase",
    className,
  );
}

export function tableRowClasses(className?: string) {
  return cn(
    "border-b border-zinc-100 transition-colors duration-150 ease-out last:border-b-0 motion-reduce:transition-none",
    className,
  );
}

export function tableCellClasses(className?: string) {
  return cn(
    "px-4 py-3 align-middle text-sm whitespace-nowrap text-zinc-800",
    className,
  );
}
