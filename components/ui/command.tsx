"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Command({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex min-w-0 flex-col overflow-hidden bg-white text-zinc-900",
        className,
      )}
      {...props}
    />
  );
}

export function CommandInput({
  className,
  wrapperClassName,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input> & {
  wrapperClassName?: string;
}) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={cn(
        "flex items-center gap-3 border-b border-zinc-100 px-4",
        wrapperClassName,
      )}
    >
      <Search className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1.5 outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function CommandEmpty({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-8 text-center text-sm text-zinc-500", className)}
      {...props}
    />
  );
}

export function CommandGroup({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-zinc-900 **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-wide **:[[cmdk-group-heading]]:text-zinc-400 **:[[cmdk-group-heading]]:uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function CommandItem({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-950",
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-zinc-100", className)}
      {...props}
    />
  );
}

export function CommandShortcut({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto shrink-0 text-xs text-zinc-400 group-data-[selected=true]/command-item:text-zinc-600",
        className,
      )}
      {...props}
    />
  );
}
