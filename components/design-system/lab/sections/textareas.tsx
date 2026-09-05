"use client";

import { useState } from "react";
import { TextArea } from "@uui/components/base/textarea/textarea";
import { Example, Grid, Stack } from "../section-frame";

const LIMIT = 280;

function CountedTextarea() {
  const [value, setValue] = useState(
    "Requesting an overload to 30 units in Semester 1 so I can finish the honours sequence on time.",
  );
  const over = value.length > LIMIT;

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        label="Reason for the request"
        placeholder="Explain why this variation should be approved"
        value={value}
        onChange={setValue}
        isInvalid={over}
        rows={5}
        hint={
          over
            ? `${value.length - LIMIT} characters over the limit.`
            : `${LIMIT - value.length} characters remaining.`
        }
      />
    </div>
  );
}

export function TextareasSection() {
  return (
    <Stack>
      <Example
        title="Sizes"
        description="Two sizes. The control grows with the rows prop rather than auto-sizing."
      >
        <Grid cols={2}>
          <TextArea
            size="sm"
            label="Notes (small)"
            placeholder="Add a note for your adviser"
            rows={3}
          />
          <TextArea
            size="md"
            label="Notes (medium)"
            placeholder="Add a note for your adviser"
            rows={3}
          />
        </Grid>
      </Example>

      <Example title="States" description="Every state, side by side.">
        <Grid cols={2}>
          <TextArea
            label="Default"
            placeholder="Add a note for your adviser"
            rows={3}
          />
          <TextArea
            label="With hint"
            placeholder="Add a note for your adviser"
            hint="Your adviser sees this when they review the plan."
            rows={3}
          />
          <TextArea
            label="Invalid"
            defaultValue="Because"
            isInvalid
            hint="Give at least one full sentence of justification."
            rows={3}
          />
          <TextArea
            label="Disabled"
            defaultValue="This plan has already been submitted for approval."
            isDisabled
            rows={3}
          />
          <TextArea
            label="Read only"
            defaultValue="Approved by Amina Okafor on 12 March 2026."
            isReadOnly
            rows={3}
          />
          <TextArea
            label="Required"
            placeholder="Explain the variation"
            isRequired
            rows={3}
          />
        </Grid>
      </Example>

      <Example
        title="Live character count"
        description="Type past 280 characters to flip the field into its invalid state."
      >
        <div className="max-w-2xl">
          <CountedTextarea />
        </div>
      </Example>
    </Stack>
  );
}
