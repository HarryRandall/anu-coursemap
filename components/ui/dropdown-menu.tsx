"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 5,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-[120] min-w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 text-zinc-950 shadow-lg ring-1 ring-zinc-950/[0.03] data-[state=closed]:animate-fade-out data-[state=open]:animate-modal-in motion-reduce:animate-none",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-950 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-zinc-400 data-[highlighted]:[&>svg]:text-zinc-600",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(
        "group/checkbox relative flex min-h-9 cursor-default items-center rounded-md py-1.5 pr-3 pl-9 text-sm font-medium text-zinc-800 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-950",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-2.5 grid size-4 place-items-center rounded-full border text-white transition-colors",
          checked
            ? "border-zinc-900 bg-zinc-900"
            : "border-zinc-300 bg-transparent",
        )}
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <Check size={11} strokeWidth={3.5} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex min-h-10 cursor-pointer items-center rounded-md py-2 pr-8 pl-2.5 text-sm text-zinc-700 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-950 data-[state=checked]:font-medium data-[state=checked]:text-zinc-950",
        className,
      )}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute right-2 grid size-4 place-items-center text-brand-600">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase data-[inset=true]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-zinc-100", className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-[10px] tracking-widest text-zinc-400",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex min-h-8 cursor-default items-center rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-zinc-100 data-[inset=true]:pl-8 data-[state=open]:bg-zinc-100",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight size={14} className="ml-auto" aria-hidden="true" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "z-[120] min-w-40 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-md",
        className,
      )}
      {...props}
    />
  );
}
