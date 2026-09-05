"use client";

import { useState } from "react";
import { Slider } from "@uui/components/base/slider/slider";
import { Example, Stack } from "../section-frame";

function UnitLoadSlider() {
  const [value, setValue] = useState(24);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Slider
        aria-label="Units each semester"
        minValue={0}
        maxValue={36}
        step={6}
        value={value}
        onChange={(next) => setValue(Array.isArray(next) ? next[0] : next)}
        labelPosition="bottom"
        labelFormatter={(units) => `${units} units`}
      />
      <p className="text-tertiary pt-4 text-sm">
        {value === 0
          ? "No study planned for this semester."
          : value > 24
            ? `${value} units is an overload and needs approval.`
            : `${value} units is a standard load.`}
      </p>
    </div>
  );
}

function YearRangeSlider() {
  const [range, setRange] = useState<[number, number]>([2024, 2027]);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Slider
        aria-label="Catalogue years"
        minValue={2020}
        maxValue={2030}
        step={1}
        value={range}
        onChange={(next) =>
          setRange(Array.isArray(next) ? [next[0], next[1]] : [next, next])
        }
        labelPosition="bottom"
        labelFormatter={(year) => String(year)}
      />
      <p className="text-tertiary pt-4 text-sm">
        Showing catalogue years {range[0]} to {range[1]}.
      </p>
    </div>
  );
}

export function SliderSection() {
  return (
    <Stack>
      <Example
        title="Single value"
        description="Drag the handle, or focus it and use the arrow keys. The step is six units, matching ANU course weights."
      >
        <UnitLoadSlider />
      </Example>

      <Example
        title="Range"
        description="Two handles over the same track. Tab moves between them."
      >
        <YearRangeSlider />
      </Example>

      <Example
        title="Label positions"
        description="The default hides the value, bottom sits under the handle and top-floating rides above it in a card."
      >
        <div className="flex max-w-lg flex-col gap-12">
          <Slider aria-label="Default" defaultValue={40} />
          <Slider
            aria-label="Bottom"
            defaultValue={60}
            labelPosition="bottom"
          />
          <Slider
            aria-label="Top floating"
            defaultValue={80}
            labelPosition="top-floating"
          />
        </div>
      </Example>

      <Example
        title="Disabled"
        description="Locked while a plan is under review."
      >
        <div className="max-w-lg">
          <Slider aria-label="Disabled" defaultValue={50} isDisabled />
        </div>
      </Example>
    </Stack>
  );
}
