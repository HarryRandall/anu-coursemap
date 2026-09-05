import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-colors outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 motion-reduce:transition-none motion-reduce:active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground shadow-xs hover:border-primary/90 hover:bg-primary/90",
        secondary:
          "border-border bg-card text-foreground/80 shadow-xs hover:border-input hover:bg-accent/50 hover:text-foreground",
        subtle:
          "border-primary/20 bg-primary/10 text-primary hover:border-primary/25 hover:bg-primary/15",
        ghost:
          "bg-transparent text-muted-foreground shadow-none hover:bg-accent hover:text-foreground",
        danger:
          "border-destructive bg-destructive text-white shadow-xs hover:border-destructive/90 hover:bg-destructive/90",
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
