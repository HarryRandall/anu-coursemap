import type { ReactNode } from "react";
import { cx } from "@uui/utils/cx";
import { ReviewAwareExample } from "@/components/design-system/review/review-section-scope";

/** A titled block inside a laboratory section. */
export function Example({
  title,
  description,
  children,
  className,
  bare = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Drop the card chrome for examples that supply their own surface. */
  bare?: boolean;
}) {
  return (
    <ReviewAwareExample
      title={title}
      description={description}
      className={className}
      bare={bare}
    >
      {children}
    </ReviewAwareExample>
  );
}

/** A labelled row of variants inside an Example. */
export function Variants({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <p className="text-quaternary text-xs font-semibold tracking-wide uppercase">
          {label}
        </p>
      )}
      <div className={cx("flex flex-wrap items-center gap-3", className)}>
        {children}
      </div>
    </div>
  );
}

/** A responsive grid for form controls and cards. */
export function Grid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid gap-5",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A stack of Examples with consistent spacing. */
export function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-10">{children}</div>;
}

/** Explains what a section deliberately does differently from upstream. */
export function FidelityNote({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-primary p-4 pl-5 ring-1 ring-secondary">
      <span
        aria-hidden="true"
        className="bg-utility-yellow-500 absolute inset-y-0 left-0 w-1"
      />
      <p className="text-tertiary text-sm">{children}</p>
    </div>
  );
}
