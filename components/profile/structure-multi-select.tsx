"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";

type StructureOption = {
  code: string;
  name: string;
};

export function StructureMultiSelect({
  className,
  hint,
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  hint: string;
  label: string;
  onChange: (codes: string[]) => void;
  options: StructureOption[];
  value: string[];
}) {
  const id = useId();
  const selected = new Set(value);

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-xs font-medium text-zinc-700">{label}</legend>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</p>
      <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-xs">
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          const checked = selected.has(option.code);
          return (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded px-2.5 py-2 hover:bg-zinc-50"
              htmlFor={optionId}
              key={option.code}
            >
              <Checkbox
                checked={checked}
                id={optionId}
                onCheckedChange={(nextChecked) => {
                  onChange(
                    nextChecked === true
                      ? [...value, option.code]
                      : value.filter((code) => code !== option.code),
                  );
                }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900">
                  {option.name}
                </span>
                <span className="block font-mono text-xs text-zinc-500">
                  {option.code}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
