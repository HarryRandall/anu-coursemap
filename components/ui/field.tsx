import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClasses =
  "h-10 w-full rounded-lg bg-white px-3 text-[13px] text-zinc-900 shadow-xs ring-1 ring-inset ring-zinc-200 transition placeholder:text-zinc-400 hover:ring-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400";

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
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-xs font-medium text-zinc-600">{label}</span>
      )}
      {children}
      {hint && (
        <span className="text-[11px] leading-relaxed text-zinc-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentPropsWithRef<"input">) {
  return <input className={cn(controlClasses, className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      className={cn(
        controlClasses,
        "h-auto min-h-28 resize-y py-2.5",
        className,
      )}
      {...rest}
    />
  );
}

export { Select, type SelectOption } from "./select";
