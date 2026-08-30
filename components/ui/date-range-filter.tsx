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
export function DateRangeFilter({
  label = "All dates",
  state,
}: {
  label?: string;
  state?: {
    value: DateRange | undefined;
    onChange: (range: DateRange | undefined) => void;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DateRange | undefined>(state?.value);
  const [month, setMonth] = useState(
    state?.value?.from ?? fromIsoDate(searchParams.get("from")) ?? new Date(),
  );

  const urlFrom = fromIsoDate(searchParams.get("from"));
  const urlTo = fromIsoDate(searchParams.get("to"));
  const selected: DateRange | undefined = state
    ? draft
    : urlFrom
      ? { from: urlFrom, to: urlTo }
      : undefined;

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
    const range = { from: start, to: end };
    if (state) {
      setDraft(range);
      state.onChange(range);
    } else {
      apply(range);
    }
    setOpen(false);
  }

  const summary = selected?.from
    ? selected.to
      ? `${formatter.format(selected.from)} to ${formatter.format(selected.to)}`
      : formatter.format(selected.from)
    : label;

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          const nextDraft = state?.value ?? selected;
          setDraft(nextDraft);
          setMonth(nextDraft?.from ?? new Date());
        } else if (state) {
          state.onChange(draft);
        }
        setOpen(nextOpen);
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-busy={!state && isPending}
          className={cn("h-9", selected?.from && "text-zinc-950")}
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
            month={month}
            mode="range"
            numberOfMonths={1}
            onMonthChange={setMonth}
            onSelect={state ? setDraft : apply}
            selected={selected}
          />
          <div className="flex shrink-0 flex-col gap-0.5 border-t border-zinc-200 p-2 sm:border-t-0 sm:border-l">
            {presets.map((preset) => (
              <button
                className="cursor-pointer rounded-md px-3 py-1.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                key={preset.days}
                onClick={() => applyPreset(preset.days)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
            {selected?.from ? (
              <button
                className="mt-1 cursor-pointer rounded-md border-t border-zinc-100 px-3 py-1.5 text-left text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                onClick={() => {
                  if (state) {
                    setDraft(undefined);
                    state.onChange(undefined);
                  } else {
                    apply(undefined);
                  }
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
