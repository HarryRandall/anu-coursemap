"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { useRef, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string | number> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
};

type SelectProps<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  "aria-label"?: string;
};

function optionValue(value: string | number) {
  return `coursemap:${String(value)}`;
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
  className,
  menuClassName,
  placeholder = "Select...",
  open,
  onOpenChange,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const selected = options.find((option) => option.value === value);
  const closedByPointer = useRef(false);

  return (
    <SelectPrimitive.Root
      value={selected ? optionValue(value) : undefined}
      disabled={disabled}
      open={open}
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        const option = options.find(
          (candidate) => optionValue(candidate.value) === nextValue,
        );
        if (option) onChange(option.value);
      }}
    >
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        aria-label={ariaLabel}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-950 shadow-xs transition-colors outline-none hover:border-zinc-300 hover:bg-zinc-50 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60 data-[placeholder]:text-zinc-400 data-[state=open]:border-brand-500 data-[state=open]:ring-3 data-[state=open]:ring-brand-500/20",
          className,
        )}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {selected?.icon ? (
            <span className="shrink-0 text-zinc-500">{selected.icon}</span>
          ) : null}
          <span
            className={cn(
              "min-w-0 truncate",
              selected ? "text-zinc-950" : "text-zinc-400",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="shrink-0 text-zinc-400"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-slot="select-content"
          position="popper"
          sideOffset={5}
          collisionPadding={8}
          className={cn(
            "z-[120] max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-lg ring-1 ring-zinc-950/[0.03] data-[state=closed]:animate-fade-out data-[state=open]:animate-modal-in motion-reduce:animate-none",
            menuClassName,
          )}
          onPointerDownOutside={() => {
            closedByPointer.current = true;
          }}
          onCloseAutoFocus={(event) => {
            if (!closedByPointer.current) return;
            event.preventDefault();
            closedByPointer.current = false;
          }}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 cursor-default items-center justify-center bg-white text-zinc-500">
            <ChevronUp size={14} aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={optionValue(option.value)}
                value={optionValue(option.value)}
                className="relative flex min-h-9 cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm text-zinc-700 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-950 data-[state=checked]:font-medium data-[state=checked]:text-zinc-950"
              >
                {option.icon ? (
                  <span className="shrink-0 text-zinc-500">{option.icon}</span>
                ) : null}
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-grid size-4 place-items-center text-brand-600">
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-7 cursor-default items-center justify-center bg-white text-zinc-500">
            <ChevronDown size={14} aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
