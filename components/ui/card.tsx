import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "rounded-xl border border-zinc-200/80 bg-white text-zinc-950 shadow-xs",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
  children,
  ...rest
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "title" | "children">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-start justify-between gap-4 px-5 py-4",
        className,
      )}
      {...rest}
    >
      {children ?? (
        <>
          <div className="flex min-w-0 items-start gap-3">
            {icon}
            <div className="min-w-0">
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {action && <CardAction>{action}</CardAction>}
        </>
      )}
    </div>
  );
}

export function CardTitle({
  className,
  ...rest
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        "text-sm font-semibold tracking-tight text-zinc-950",
        className,
      )}
      {...rest}
    />
  );
}

export function CardDescription({
  className,
  ...rest
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("mt-0.5 text-xs leading-relaxed text-zinc-500", className)}
      {...rest}
    />
  );
}

export function CardAction({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...rest}
    />
  );
}

export function CardContent({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 pb-5", className)}
      {...rest}
    />
  );
}

export function CardFooter({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3.5",
        className,
      )}
      {...rest}
    />
  );
}
