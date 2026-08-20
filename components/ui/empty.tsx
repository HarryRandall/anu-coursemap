import { cn } from "@/lib/cn";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-3 rounded-lg px-5 py-10 text-center text-balance",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-1.5", className)}
      {...props}
    />
  );
}

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "icon" | "error";
}) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(
        "mb-1.5 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
        variant === "default" && "bg-transparent",
        variant === "icon" &&
          "size-9 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 [&_svg:not([class*='size-'])]:size-4",
        variant === "error" &&
          "size-9 rounded-md border border-rose-200 bg-rose-50 text-rose-600 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "text-sm font-semibold tracking-tight text-zinc-950",
        className,
      )}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "text-sm leading-relaxed text-zinc-500 [&>a]:text-brand-700 [&>a]:underline [&>a]:underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
        className,
      )}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};
