import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-colors outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 motion-reduce:transition-none motion-reduce:active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-brand-600 bg-brand-600 text-white shadow-xs hover:border-brand-700 hover:bg-brand-700",
        secondary:
          "border-zinc-200 bg-white text-zinc-700 shadow-xs hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950",
        subtle:
          "border-brand-100 bg-brand-50 text-brand-700 hover:border-brand-200 hover:bg-brand-100",
        ghost:
          "bg-transparent text-zinc-600 shadow-none hover:bg-zinc-100 hover:text-zinc-950",
        danger:
          "border-rose-600 bg-rose-600 text-white shadow-xs hover:border-rose-700 hover:bg-rose-700",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-xs",
        md: "h-9 px-3.5",
        lg: "h-10 px-4",
        "icon-sm": "size-8 p-0",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

type CommonProps = {
  variant?: NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
  size?: NonNullable<VariantProps<typeof buttonVariants>["size"]>;
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
    buttonVariants({ variant, size }),
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
  // Firefox persists dynamic disabled across soft reloads; keep SSR in sync.
  const firefoxFormProps = { autoComplete: "off" as const };
  return (
    <button
      data-slot="button"
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...firefoxFormProps}
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
      data-slot="button"
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {children}
    </Link>
  );
}

type IconButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: "icon-sm" | "icon";
  className?: string;
  children: ReactNode;
} & Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "children" | "aria-label"
>;

export function IconButton({
  label,
  variant = "secondary",
  size = "icon",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  const firefoxFormProps = { autoComplete: "off" as const };
  return (
    <button
      data-slot="button"
      type={type}
      aria-label={label}
      title={label}
      className={buttonClasses({ variant, size, className })}
      {...firefoxFormProps}
      {...rest}
    >
      {children}
    </button>
  );
}
