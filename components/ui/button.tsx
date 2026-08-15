import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-[background,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3.5 text-[13px]",
  lg: "h-12 px-5 text-sm",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white shadow-sm hover:bg-brand-800 ring-1 ring-inset ring-brand-700",
  secondary:
    "bg-white text-zinc-700 shadow-xs ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300",
  subtle:
    "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 hover:bg-brand-100",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger:
    "bg-white text-rose-600 shadow-xs ring-1 ring-inset ring-rose-200 hover:bg-rose-50",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  fullWidth,
  className,
}: Omit<CommonProps, "children">) {
  return cn(
    base,
    sizes[size],
    variants[variant],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {children}
    </Link>
  );
}

type IconButtonProps = {
  label: string;
  className?: string;
  children: ReactNode;
} & Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "children" | "aria-label"
>;

export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-9 place-items-center rounded-lg bg-white text-zinc-500 shadow-xs ring-1 ring-zinc-200 transition ring-inset hover:bg-zinc-50 hover:text-zinc-800 hover:ring-zinc-300 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
