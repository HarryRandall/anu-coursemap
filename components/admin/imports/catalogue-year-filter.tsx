"use client";

import { Check, ChevronLeft, ListFilter, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Same Filter drill-down as FilterBar, scoped to catalogue year so import
 * pages can sit a year control beside a find field without a second Select.
 */
export function CatalogueYearFilter({
  years,
  value,
  onChange,
}: {
  years: number[];
  /** Empty string means all years. */
  value: string;
  onChange: (value: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  function openMenu(open: boolean) {
    setMenuOpen(open);
    if (!open) setPicking(false);
  }

  return (
    <>
      <Popover onOpenChange={openMenu} open={menuOpen}>
        <PopoverTrigger asChild>
          <Button
            className="h-10 shrink-0 px-3.5"
            size="md"
            variant="secondary"
          >
            <ListFilter size={16} aria-hidden="true" />
            Filter
            {value ? (
              <span className="grid min-w-5 place-items-center rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                1
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-0">
          {picking ? (
            <Command label="Catalogue year">
              <div className="flex items-center gap-1 border-b border-zinc-100 px-1.5 py-1.5">
                <button
                  className="grid size-6 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                  onClick={() => setPicking(false)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={14} />
                  <span className="sr-only">Back to all filters</span>
                </button>
                <span className="text-xs font-medium text-zinc-700">
                  Catalogue year
                </span>
              </div>
              <CommandInput placeholder="Search catalogue year..." />
              <CommandList className="max-h-64">
                <CommandEmpty>No values match.</CommandEmpty>
                <CommandGroup>
                  {[
                    { value: "", label: "All years" },
                    ...years.map((year) => ({
                      value: String(year),
                      label: String(year),
                    })),
                  ].map((option) => {
                    const selected = value === option.value;
                    return (
                      <CommandItem
                        key={option.value || "__all"}
                        onSelect={() => {
                          onChange(option.value);
                          openMenu(false);
                        }}
                        value={option.label}
                      >
                        <Check
                          aria-hidden="true"
                          className={
                            selected ? "text-zinc-900" : "text-transparent"
                          }
                          size={14}
                        />
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <Command label="Choose a filter">
              <CommandInput placeholder="Filter..." />
              <CommandList className="max-h-64">
                <CommandEmpty>No filters match.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setPicking(true)}
                    value="Catalogue year"
                  >
                    <ListFilter
                      aria-hidden="true"
                      className="text-zinc-400"
                      size={14}
                    />
                    Catalogue year
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>

      {value ? (
        <div className="basis-full">
          <span className="inline-flex items-center overflow-hidden rounded-md border border-zinc-200 bg-white text-xs shadow-xs">
            <span className="py-1.5 pr-1.5 pl-2.5 text-zinc-500">
              Catalogue year
            </span>
            <span className="py-1.5 font-medium text-zinc-900">{value}</span>
            <button
              aria-label="Remove the Catalogue year filter"
              className="ml-1.5 grid h-full place-items-center border-l border-zinc-200 px-1.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
              onClick={() => onChange("")}
              type="button"
            >
              <X aria-hidden="true" size={12} />
            </button>
          </span>
        </div>
      ) : null}
    </>
  );
}
