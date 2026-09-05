"use client";

import { useState } from "react";
import { Checkbox } from "@uui/components/base/checkbox/checkbox";
import {
  RadioButton,
  RadioGroup,
} from "@uui/components/base/radio-buttons/radio-buttons";
import { Toggle } from "@uui/components/base/toggle/toggle";
import { requirements } from "../content";
import { Example, Grid, Stack, Variants } from "../section-frame";

function RequirementChecklist() {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(["mathematics"]),
  );

  const toggle = (id: string, on: boolean) =>
    setChecked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const allChecked = checked.size === requirements.length;
  const someChecked = checked.size > 0 && !allChecked;

  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        size="md"
        label="Show every requirement"
        isSelected={allChecked}
        isIndeterminate={someChecked}
        onChange={(on) =>
          setChecked(on ? new Set(requirements.map((r) => r.id)) : new Set())
        }
      />
      <div className="flex flex-col gap-3 border-t border-secondary pt-4 pl-6">
        {requirements.map((requirement) => (
          <Checkbox
            key={requirement.id}
            label={requirement.title}
            hint={requirement.detail}
            isSelected={checked.has(requirement.id)}
            onChange={(on) => toggle(requirement.id, on)}
          />
        ))}
      </div>
      <p className="text-sm text-tertiary">
        {checked.size} of {requirements.length} requirement groups shown.
      </p>
    </div>
  );
}

function PlanModeRadios() {
  const [mode, setMode] = useState("standard");

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup size="md" value={mode} onChange={setMode}>
        <RadioButton
          value="standard"
          label="Standard load"
          hint="24 units each semester, finishing in four years."
        />
        <RadioButton
          value="accelerated"
          label="Accelerated load"
          hint="30 units each semester. Requires an overload approval."
        />
        <RadioButton
          value="reduced"
          label="Reduced load"
          hint="12 units each semester, for part-time study."
        />
        <RadioButton
          value="deferred"
          label="Deferred"
          hint="Not currently available for your programme."
          isDisabled
        />
      </RadioGroup>
      <p className="text-sm text-tertiary">
        Planning with the <strong className="text-secondary">{mode}</strong>{" "}
        load.
      </p>
    </div>
  );
}

function NotificationToggles() {
  const [prefs, setPrefs] = useState({
    prerequisites: true,
    census: true,
    timetable: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <Toggle
        size="md"
        label="Prerequisite warnings"
        hint="Tell me when a planned course loses a satisfied prerequisite."
        isSelected={prefs.prerequisites}
        onChange={(on) => setPrefs((p) => ({ ...p, prerequisites: on }))}
      />
      <Toggle
        size="md"
        label="Census date reminders"
        hint="Email me a week before each census date."
        isSelected={prefs.census}
        onChange={(on) => setPrefs((p) => ({ ...p, census: on }))}
      />
      <Toggle
        size="md"
        label="Timetable clashes"
        hint="Not available until the timetable is published."
        isSelected={prefs.timetable}
        onChange={(on) => setPrefs((p) => ({ ...p, timetable: on }))}
        isDisabled
      />
      <p className="text-sm text-tertiary">
        {Object.values(prefs).filter(Boolean).length} of 3 notifications on.
      </p>
    </div>
  );
}

export function ChoicesSection() {
  return (
    <Stack>
      <Example
        title="Checkbox states"
        description="Unchecked, checked, indeterminate and disabled, in both sizes."
      >
        <div className="flex flex-col gap-6">
          {(["sm", "md"] as const).map((size) => (
            <Variants key={size} label={size} className="gap-8">
              <Checkbox size={size} label="Unchecked" />
              <Checkbox size={size} label="Checked" defaultSelected />
              <Checkbox size={size} label="Indeterminate" isIndeterminate />
              <Checkbox size={size} label="Disabled" isDisabled />
              <Checkbox
                size={size}
                label="Disabled checked"
                isDisabled
                defaultSelected
              />
            </Variants>
          ))}
        </div>
      </Example>

      <Example
        title="Checkbox with an indeterminate parent"
        description="Toggling the parent selects or clears every child. Clearing one child returns the parent to indeterminate."
      >
        <RequirementChecklist />
      </Example>

      <Example
        title="Radio states"
        description="Unselected, selected and disabled, in both sizes."
      >
        <div className="flex flex-col gap-6">
          {(["sm", "md"] as const).map((size) => (
            <RadioGroup
              key={size}
              size={size}
              orientation="horizontal"
              defaultValue="b"
              className="flex flex-wrap gap-8"
            >
              <RadioButton value="a" label="Unselected" />
              <RadioButton value="b" label="Selected" />
              <RadioButton value="c" label="Disabled" isDisabled />
            </RadioGroup>
          ))}
        </div>
      </Example>

      <Example
        title="Radio group with hints"
        description="Arrow keys move the selection; the group takes a single tab stop."
      >
        <div className="max-w-xl">
          <PlanModeRadios />
        </div>
      </Example>

      <Example
        title="Toggle states"
        description="Off, on and disabled, in standard and slim variants."
      >
        <div className="flex flex-col gap-6">
          {(["sm", "md"] as const).map((size) => (
            <Variants key={size} label={size} className="gap-8">
              <Toggle size={size} label="Off" />
              <Toggle size={size} label="On" defaultSelected />
              <Toggle size={size} label="Disabled" isDisabled />
              <Toggle size={size} slim label="Slim off" />
              <Toggle size={size} slim label="Slim on" defaultSelected />
            </Variants>
          ))}
        </div>
      </Example>

      <Example
        title="Notification preferences"
        description="Three real toggles with a live count."
      >
        <div className="max-w-xl">
          <NotificationToggles />
        </div>
      </Example>

      <Example
        title="In a form"
        description="Selection controls at the density Coursemap's settings screens use."
      >
        <Grid cols={2}>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-secondary">
              Include in plan
            </p>
            <Checkbox label="Completed courses" defaultSelected />
            <Checkbox label="Enrolled courses" defaultSelected />
            <Checkbox label="Planned courses" defaultSelected />
            <Checkbox label="Courses with unmet prerequisites" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-secondary">
              Export format
            </p>
            <RadioGroup defaultValue="pdf">
              <RadioButton value="pdf" label="PDF transcript" />
              <RadioButton value="csv" label="CSV of course rows" />
              <RadioButton value="ics" label="Calendar file" />
            </RadioGroup>
          </div>
        </Grid>
      </Example>
    </Stack>
  );
}
