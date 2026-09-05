import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function DataList({
  className,
  ...rest
}: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      data-slot="data-list"
      className={cn("divide-y divide-border/60", className)}
      {...rest}
    />
  );
}

export function DataListItem({
  className,
  ...rest
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      data-slot="data-list-item"
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
      {...rest}
    />
  );
}

export function DataListIcon({
  className,
  ...rest
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      data-slot="data-list-icon"
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md border border-border bg-muted/50 text-muted-foreground [&>svg]:size-4",
        className,
      )}
      {...rest}
    />
  );
}

export function DataListContent({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="data-list-content"
      className={cn("min-w-0 flex-1", className)}
      {...rest}
    />
  );
}

export function DataListMeta({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="data-list-meta"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...rest}
    />
  );
}

export function DataListTitle({
  className,
  ...rest
}: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      data-slot="data-list-title"
      className={cn(
        "mt-1 truncate text-sm font-medium text-foreground",
        className,
      )}
      {...rest}
    />
  );
}

export function DataListDescription({
  className,
  ...rest
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      data-slot="data-list-description"
      className={cn("mt-0.5 truncate text-xs text-muted-foreground", className)}
      {...rest}
    />
  );
}

export function DataListActions({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="data-list-actions"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 sm:justify-end",
        className,
      )}
      {...rest}
    />
  );
}
