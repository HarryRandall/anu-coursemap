"use client";

import { useState } from "react";
import { Hash01, Mail01, SearchLg, User01 } from "@untitledui/icons";
import { Input } from "@uui/components/base/input/input";
import {
  InputGroup,
  InputPrefix,
} from "@uui/components/base/input/input-group";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { PinInput } from "@uui/components/base/input/pin-input";
import { Example, Grid, Stack } from "../section-frame";

const STUDENT_NUMBER = /^u\d{7}$/i;

function ValidatedStudentNumber() {
  const [value, setValue] = useState("u123");
  const invalid = value.length > 0 && !STUDENT_NUMBER.test(value);

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Student number"
        placeholder="u1234567"
        icon={User01}
        value={value}
        onChange={setValue}
        isInvalid={invalid}
        isRequired
        hint={
          invalid
            ? "A student number is the letter u followed by seven digits."
            : "Used to match your enrolment record."
        }
      />
      <p className="text-sm text-tertiary">
        {invalid
          ? "The field is invalid, so the border, icon and hint all turn red."
          : "Valid. Clear the field or type u123 to see the invalid state."}
      </p>
    </div>
  );
}

function SearchField() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <Input
        aria-label="Search courses"
        placeholder="Search courses"
        icon={SearchLg}
        shortcut="⌘K"
        value={query}
        onChange={setQuery}
      />
      <p className="text-sm text-tertiary">
        {query
          ? `Searching for "${query}".`
          : "Type to search. The shortcut hint sits inside the field."}
      </p>
    </div>
  );
}

function PinDemo() {
  const [pin, setPin] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <PinInput size="xs">
        <PinInput.Label>Approval code</PinInput.Label>
        <PinInput.Group
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={pin}
          onChange={setPin}
        >
          <PinInput.Slot index={0} />
          <PinInput.Slot index={1} />
          <PinInput.Slot index={2} />
          <PinInput.Separator />
          <PinInput.Slot index={3} />
          <PinInput.Slot index={4} />
          <PinInput.Slot index={5} />
        </PinInput.Group>
        <PinInput.Description>
          Six digits, sent to your ANU address.
        </PinInput.Description>
      </PinInput>
      <p className="text-sm text-tertiary">
        {pin.length === 6
          ? "Code complete."
          : `${pin.length} of 6 digits entered.`}
      </p>
    </div>
  );
}

export function InputsSection() {
  return (
    <Stack>
      <Example
        title="Sizes"
        description="Small, medium and large. Coursemap forms use medium."
      >
        <Grid cols={3}>
          {(["sm", "md", "lg"] as const).map((size) => (
            <Input
              key={size}
              size={size}
              label={`Course code (${size})`}
              placeholder="COMP1100"
              icon={Hash01}
            />
          ))}
        </Grid>
      </Example>

      <Example
        title="Anatomy"
        description="Label, icon, placeholder, hint and the required indicator."
      >
        <Grid cols={2}>
          <Input label="Course code" placeholder="COMP1100" />
          <Input
            label="Course code"
            placeholder="COMP1100"
            icon={Hash01}
            hint="Six characters, for example COMP1100."
          />
          <Input
            label="ANU email"
            placeholder="u1234567@anu.edu.au"
            icon={Mail01}
            isRequired
            hint="We only use this for plan approvals."
          />
          <Input
            label="Course code"
            placeholder="COMP1100"
            tooltip="Course codes come from the published ANU catalogue."
            hint="Hover the help icon beside the label."
          />
        </Grid>
      </Example>

      <Example
        title="States"
        description="Every state the field can reach, side by side."
      >
        <Grid cols={2}>
          <Input label="Default" placeholder="COMP1100" />
          <Input
            label="Filled"
            defaultValue="COMP1100"
            hint="A completed field."
          />
          <Input
            label="Invalid"
            defaultValue="COMP11"
            isInvalid
            hint="Course codes are eight characters."
          />
          <Input
            label="Disabled"
            defaultValue="COMP1100"
            isDisabled
            hint="Locked because the plan is submitted."
          />
          <Input
            label="Read only"
            defaultValue="COMP1100"
            isReadOnly
            hint="Shown but not editable."
          />
          <Input
            label="Required"
            placeholder="COMP1100"
            isRequired
            hint="The asterisk marks a required field."
          />
        </Grid>
      </Example>

      <Example
        title="Live validation"
        description="Type into the field. The invalid state is driven by a real pattern check, not a static prop."
      >
        <div className="max-w-md">
          <ValidatedStudentNumber />
        </div>
      </Example>

      <Example
        title="Search with a keyboard shortcut"
        description="The shortcut hint renders inside the field, right aligned."
      >
        <div className="max-w-md">
          <SearchField />
        </div>
      </Example>

      <Example
        title="Input groups"
        description="Prefixes and addons for structured values."
      >
        <Grid cols={2}>
          <InputGroup
            label="Plan link"
            leadingAddon={<InputPrefix>coursemap.app/</InputPrefix>}
          >
            <Input placeholder="advanced-computing-2026" />
          </InputGroup>
          <InputGroup
            label="Units"
            trailingAddon={<InputPrefix>units</InputPrefix>}
          >
            <Input placeholder="6" />
          </InputGroup>
        </Grid>
      </Example>

      <Example
        title="Pin input"
        description="Six-digit approval code. Paste a whole code and it distributes across the boxes."
      >
        <div className="max-w-md">
          <PinDemo />
        </div>
      </Example>
    </Stack>
  );
}
