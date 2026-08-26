"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, type DateRange } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

const presets = [
  { days: 1, label: "Last 24 hours" },
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function fromIsoDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

const formatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
});

/**
 * URL-bound date range, with the presets people actually reach for first and
 * a two-month calendar for anything else.
 */
export function DateRangeFilter({ label = "All dates" }: { label?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const from = fromIsoDate(searchParams.get("from"));
  const to = fromIsoDate(searchParams.get("to"));
  const selected: DateRange | undefined = from ? { from, to } : undefined;

  function apply(range: DateRange | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (range?.from) params.set("from", toIsoDate(range.from));
    else params.delete("from");
    if (range?.to) params.set("to", toIsoDate(range.to));
    else params.delete("to");
    params.delete("page");
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  }

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    apply({ from: start, to: end });
    setOpen(false);
  }

  const summary = from
    ? to
      ? `${formatter.format(from)} – ${formatter.format(to)}`
      : formatter.format(from)
    : label;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-busy={isPending}
          className={cn("h-10", from && "text-zinc-950")}
          size="md"
          variant="secondary"
        >
          <CalendarDays aria-hidden="true" size={16} />
          {summary}
          <ChevronDown aria-hidden="true" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            defaultMonth={from}
            mode="range"
            numberOfMonths={2}
            onSelect={apply}
            selected={selected}
          />
          <div className="flex shrink-0 flex-col gap-0.5 border-t border-zinc-200 p-2 sm:border-t-0 sm:border-l">
            {presets.map((preset) => (
              <button
                className="rounded-md px-3 py-1.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                key={preset.days}
                onClick={() => applyPreset(preset.days)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
            {from ? (
              <button
                className="mt-1 rounded-md border-t border-zinc-100 px-3 py-1.5 text-left text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                onClick={() => {
                  apply(undefined);
                  setOpen(false);
                }}
                type="button"
              >
                Clear dates
              </button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
