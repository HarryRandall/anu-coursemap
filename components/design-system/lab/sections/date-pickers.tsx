"use client";

import { useState } from "react";
import type { DateValue, RangeValue } from "react-aria-components";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { DatePicker } from "@uui/components/application/date-picker/date-picker";
import { DateRangePicker } from "@uui/components/application/date-picker/date-range-picker";
import { Example, Stack } from "../section-frame";

function CensusDatePicker() {
  const [value, setValue] = useState<DateValue | null>(parseDate("2026-03-31"));

  return (
    <div className="flex flex-col gap-3">
      <DatePicker value={value} onChange={setValue} />
      <p className="text-tertiary text-sm">
        {value
          ? `Census date set to ${value.toDate(getLocalTimeZone()).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.`
          : "No census date chosen."}
      </p>
    </div>
  );
}

function TeachingPeriodRange() {
  const [range, setRange] = useState<RangeValue<DateValue> | null>({
    start: parseDate("2026-02-16"),
    end: parseDate("2026-05-22"),
  });

  const format = (date: DateValue) =>
    date
      .toDate(getLocalTimeZone())
      .toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-3">
      <DateRangePicker value={range} onChange={setRange} />
      <p className="text-tertiary text-sm">
        {range
          ? `Semester 1 runs ${format(range.start)} to ${format(range.end)}.`
          : "No teaching period chosen. Pick a start and end date, then apply."}
      </p>
    </div>
  );
}

export function DatePickersSection() {
  return (
    <Stack>
      <Example
        title="Date picker"
        description="Open the calendar, move with the arrow keys, choose with Enter, then Apply. Cancel restores the previous value."
      >
        <div className="max-w-md">
          <CensusDatePicker />
        </div>
      </Example>

      <Example
        title="Date range picker"
        description="Two-month calendar with preset ranges down the side. Choose a start and an end, then Apply."
      >
        <TeachingPeriodRange />
      </Example>

      <Example
        title="Bounded to the catalogue year"
        description="minValue and maxValue keep the selection inside the published 2026 teaching calendar. Dates outside it cannot be focused."
      >
        <div className="max-w-md">
          <DatePicker
            minValue={parseDate("2026-01-01")}
            maxValue={parseDate("2026-12-31")}
            defaultValue={parseDate("2026-06-05")}
          />
        </div>
      </Example>

      <Example
        title="Empty and today"
        description="With no value the trigger shows its placeholder. The calendar still opens on today."
      >
        <div className="flex max-w-md flex-col gap-5">
          <DatePicker />
          <DatePicker defaultValue={today(getLocalTimeZone())} />
        </div>
      </Example>
    </Stack>
  );
}
