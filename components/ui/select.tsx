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
      value={selected ? optionValue(value) : ""}
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
          "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-popover px-3 text-left text-sm text-foreground shadow-xs transition-colors outline-none hover:border-input hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-accent/50 disabled:opacity-60 data-[placeholder]:text-muted-foreground/80 data-[state=open]:border-primary data-[state=open]:ring-3 data-[state=open]:ring-ring/20",
          className,
        )}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {selected?.icon ? (
            <span className="shrink-0 text-muted-foreground">
              {selected.icon}
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-0 truncate",
              selected ? "text-foreground" : "text-muted-foreground/80",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground/80"
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
            "z-[120] max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-popover text-foreground shadow-lg ring-1 ring-zinc-950/[0.03] data-[state=closed]:animate-fade-out data-[state=open]:animate-modal-in motion-reduce:animate-none",
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
          <SelectPrimitive.ScrollUpButton className="flex h-7 cursor-default items-center justify-center bg-card text-muted-foreground">
            <ChevronUp size={14} aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={optionValue(option.value)}
                value={optionValue(option.value)}
                className="relative flex min-h-9 cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm text-foreground/80 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent data-[highlighted]:text-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
              >
                {option.icon ? (
                  <span className="shrink-0 text-muted-foreground">
                    {option.icon}
                  </span>
                ) : null}
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-grid size-4 place-items-center text-primary">
                  <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-7 cursor-default items-center justify-center bg-card text-muted-foreground">
            <ChevronDown size={14} aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
