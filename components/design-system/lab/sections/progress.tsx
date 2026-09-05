"use client";

import { useEffect, useState } from "react";
import { Button } from "@uui/components/base/buttons/button";
import {
  ProgressBar,
  ProgressBarBase,
} from "@uui/components/base/progress-indicators/progress-indicators";
import {
  ProgressBarCircle,
  ProgressBarHalfCircle,
} from "@uui/components/base/progress-indicators/progress-circles";
import { requirements } from "../content";
import { Example, Grid, Stack } from "../section-frame";

function ImportProgress() {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setValue((current) => {
        if (current >= 100) {
          setRunning(false);
          return 100;
        }
        return Math.min(100, current + 7);
      });
    }, 220);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <ProgressBar
        value={value}
        labelPosition="bottom"
        valueFormatter={(v) => `${Math.round(v)}% of 1,284 courses imported`}
      />
      <div className="flex gap-3">
        <Button
          size="sm"
          onClick={() => {
            setValue(0);
            setRunning(true);
          }}
          isDisabled={running}
        >
          {value === 100 ? "Run again" : "Start import"}
        </Button>
        <Button
          size="sm"
          color="secondary"
          onClick={() => {
            setRunning(false);
            setValue(0);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function ProgressSection() {
  return (
    <Stack>
      <Example
        title="Progress bars"
        description="Label positions from the upstream component: none, right, bottom and bottom-trailing."
      >
        <div className="flex max-w-xl flex-col gap-8">
          <ProgressBarBase value={35} />
          <ProgressBar value={50} labelPosition="right" />
          <ProgressBar value={65} labelPosition="bottom" />
          <ProgressBar value={80} labelPosition="top-floating" />
        </div>
      </Example>

      <Example
        title="Requirement progress"
        description="Each requirement group as a share of its unit target."
      >
        <div className="flex flex-col gap-6">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-secondary">
                  {requirement.title}
                </span>
                <span className="font-mono text-xs text-quaternary">
                  {requirement.completed} / {requirement.required} units
                </span>
              </div>
              <ProgressBarBase
                value={(requirement.completed / requirement.required) * 100}
              />
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Progress circles"
        description="For metric tiles where a bar would be too wide."
      >
        <Grid cols={4}>
          {(
            [
              { size: "xxs", value: 25 },
              { size: "xs", value: 50 },
              { size: "sm", value: 75 },
              { size: "md", value: 100 },
            ] as const
          ).map((entry) => (
            <div key={entry.size} className="flex justify-center">
              <ProgressBarCircle
                size={entry.size}
                value={entry.value}
                label="of 192 units"
              />
            </div>
          ))}
        </Grid>
      </Example>

      <Example
        title="Half circles"
        description="The gauge variant, for a single headline figure."
      >
        <Grid cols={3}>
          {(["xs", "sm", "md"] as const).map((size) => (
            <div key={size} className="flex justify-center">
              <ProgressBarHalfCircle
                size={size}
                value={50}
                label="Degree complete"
              />
            </div>
          ))}
        </Grid>
      </Example>

      <Example
        title="Live progress"
        description="A real timer drives the bar. Start it, then reset it."
      >
        <ImportProgress />
      </Example>
    </Stack>
  );
}
