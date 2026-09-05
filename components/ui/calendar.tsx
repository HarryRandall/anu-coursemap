"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { cn } from "@/lib/cn";

export type { DateRange };

/**
 * Range calendar built on react-day-picker so keyboard navigation, focus
 * management and locale handling come from a maintained implementation
 * rather than a hand-rolled grid.
 */
export function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "absolute inset-x-3 top-3 flex items-center justify-between",
        button_previous:
          "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30",
        button_next:
          "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[11px] font-medium text-muted-foreground/80",
        week: "mt-1 flex",
        day: "relative size-8 p-0 text-center text-[13px] focus-within:relative focus-within:z-20",
        day_button:
          "grid size-8 place-items-center rounded-md font-medium text-foreground/80 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
        range_start: "rounded-l-md bg-primary/10",
        range_end: "rounded-r-md bg-primary/10",
        range_middle:
          "bg-primary/10 [&>button]:bg-transparent [&>button]:text-primary [&>button]:hover:bg-primary/15",
        today: "[&>button]:font-bold [&>button]:text-primary",
        outside: "[&>button]:text-muted-foreground/60",
        disabled:
          "[&>button]:pointer-events-none [&>button]:text-muted-foreground/60",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft aria-hidden="true" size={16} {...rest} />
          ) : (
            <ChevronRight aria-hidden="true" size={16} {...rest} />
          ),
      }}
      showOutsideDays
      {...props}
    />
  );
}
