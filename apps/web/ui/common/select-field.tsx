"use client";

import { useId, type ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@coursemap/ui/primitives/field";
import { OptionPicker } from "@/ui/common/option-picker";
import type { OptionMenuItem } from "@/ui/common/option-menu";
import { cn } from "@/lib/cn";

export type SelectFieldOption<T extends string | number> = {
  value: T;
  label: string;
};

/**
 * A labelled single-value picker for forms. Values may be numbers (years) or
 * strings (codes); they are stringified for the menu and converted back on
 * change so callers keep their own types.
 */
export function SelectField<T extends string | number>({
  className,
  description,
  disabled,
  items,
  label,
  onValueChange,
  placeholder = "Select...",
  searchable = "auto",
  value,
}: {
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  items: readonly SelectFieldOption<T>[];
  label: string;
  onValueChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean | "auto";
  value: T;
}) {
  const id = useId();
  const menuItems: OptionMenuItem<string>[] = items.map((item) => ({
    value: String(item.value),
    label: item.label,
  }));
  return (
    <Field className={cn("gap-2", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <OptionPicker
        className="w-full"
        disabled={disabled}
        id={id}
        items={menuItems}
        onValueChange={(next) => {
          const match = items.find((item) => String(item.value) === next);
          if (match) onValueChange(match.value);
        }}
        placeholder={placeholder}
        searchable={searchable}
        value={String(value)}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}
