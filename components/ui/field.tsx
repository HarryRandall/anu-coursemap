import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClasses =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-xs outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60 aria-invalid:border-rose-500 aria-invalid:ring-rose-500/20";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      data-slot="field"
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
    >
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </label>
  );
}

export function FieldGroup({
  className,
  ...rest
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("grid gap-4", className)}
      {...rest}
    />
  );
}

export function FieldLabel({
  className,
  ...rest
}: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="field-label"
      className={cn("text-xs font-medium text-zinc-700", className)}
      {...rest}
    />
  );
}

export function FieldDescription({
  className,
  ...rest
}: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="field-description"
      className={cn("text-xs leading-relaxed text-zinc-500", className)}
      {...rest}
    />
  );
}

export function FieldError({
  className,
  ...rest
}: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="field-error"
      role="alert"
      className={cn("text-xs leading-relaxed text-rose-600", className)}
      {...rest}
    />
  );
}

export function Input({ className, ...rest }: ComponentPropsWithRef<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(controlClasses, className)}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        controlClasses,
        "h-auto min-h-24 resize-y py-2.5 leading-relaxed",
        className,
      )}
      {...rest}
    />
  );
}

export { Select, type SelectOption } from "./select";
