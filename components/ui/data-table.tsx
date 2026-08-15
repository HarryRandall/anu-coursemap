import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Adapted from ShowCrafter's shared admin table shell. */
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
        "relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs",
        viewport && "min-h-0 md:flex md:flex-1 md:flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "relative isolate min-h-0 overflow-x-auto overscroll-x-contain",
          viewport && "md:flex md:flex-1 md:overflow-auto",
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-zinc-200 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function tableClasses(className?: string) {
  return cn(
    "w-full min-w-[760px] caption-bottom border-separate border-spacing-0 text-left text-sm",
    className,
  );
}

export function tableHeadClasses(className?: string) {
  return cn(
    "bg-white [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:border-b [&_th]:border-zinc-200 [&_th]:bg-white",
    className,
  );
}

export function tableHeaderCellClasses(className?: string) {
  return cn(
    "h-11 px-4 py-3 text-left align-middle text-sm font-medium whitespace-nowrap text-zinc-900",
    className,
  );
}

export function tableRowClasses(className?: string) {
  return cn(
    "transition-colors last:[&>*]:border-b-0 [&>*]:border-b [&>*]:border-zinc-200",
    className,
  );
}

export function tableCellClasses(className?: string) {
  return cn(
    "px-4 py-3 align-middle text-sm whitespace-nowrap text-zinc-900",
    className,
  );
}
