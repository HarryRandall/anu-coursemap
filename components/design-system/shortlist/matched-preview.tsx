"use client";
import { useState } from "react";
import { Button as ReuiButton } from "@reui/ui/button";
import { Input as ReuiInput } from "@reui/ui/input";
import { Button as UntitledButton } from "@uui/components/base/buttons/button";
import { Input as UntitledInput } from "@uui/components/base/input/input";
import type { ShortlistOption } from "./catalogue";

export function MatchedPreview({
  kind,
  states,
}: {
  kind: NonNullable<ShortlistOption["comparison"]>;
  states: boolean;
}) {
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState("");
  const untitled = kind.startsWith("untitled");
  if (kind.endsWith("buttons"))
    return (
      <section
        className={`matched-preview ${untitled ? "matched-untitled" : ""}`}
        aria-label="Course actions"
      >
        <div>
          <span className="matched-caption">COMP2100 · 6 units</span>
          <h2>Software Design Methodologies</h2>
          <p>Semester 1 · Prerequisites met</p>
        </div>
        {states ? (
          <div className="matched-actions">
            {untitled ? (
              <>
                <UntitledButton isDisabled>Add to plan</UntitledButton>
                <UntitledButton
                  color="primary-destructive"
                  onClick={() =>
                    setMessage(
                      "Removal preview only. No saved plan was changed.",
                    )
                  }
                >
                  Remove course
                </UntitledButton>
              </>
            ) : (
              <>
                <ReuiButton disabled>Add to plan</ReuiButton>
                <ReuiButton
                  variant="destructive"
                  onClick={() =>
                    setMessage(
                      "Removal preview only. No saved plan was changed.",
                    )
                  }
                >
                  Remove course
                </ReuiButton>
              </>
            )}
          </div>
        ) : (
          <div className="matched-actions">
            {untitled ? (
              <>
                <UntitledButton onClick={() => setAdded(!added)}>
                  {added ? "Added to preview" : "Add to plan"}
                </UntitledButton>
                <UntitledButton
                  color="secondary"
                  onClick={() =>
                    setMessage("Requires COMP1110. Offered in Semester 1.")
                  }
                >
                  View details
                </UntitledButton>
                <UntitledButton
                  color="tertiary"
                  onClick={() => {
                    setAdded(false);
                    setMessage("");
                  }}
                >
                  Cancel
                </UntitledButton>
              </>
            ) : (
              <>
                <ReuiButton onClick={() => setAdded(!added)}>
                  {added ? "Added to preview" : "Add to plan"}
                </ReuiButton>
                <ReuiButton
                  variant="outline"
                  onClick={() =>
                    setMessage("Requires COMP1110. Offered in Semester 1.")
                  }
                >
                  View details
                </ReuiButton>
                <ReuiButton
                  variant="ghost"
                  onClick={() => {
                    setAdded(false);
                    setMessage("");
                  }}
                >
                  Cancel
                </ReuiButton>
              </>
            )}
          </div>
        )}
        <p role="status">
          {message ||
            (added
              ? "Course added to this preview only."
              : "Try the actions. Your saved plan stays unchanged.")}
        </p>
      </section>
    );
  return (
    <section
      className={`matched-preview ${untitled ? "matched-untitled" : ""}`}
      aria-label="Course search fields"
    >
      <h2>Find a course</h2>
      {untitled ? (
        <>
          <UntitledInput
            label="Course search"
            placeholder="e.g. COMP2100"
            hint="Search by code or course name."
          />
          <UntitledInput
            label="Semester"
            defaultValue="Semester 1, 2026"
            isDisabled={states}
          />
          {states && (
            <UntitledInput
              label="Course code"
              defaultValue="COMP"
              isInvalid
              hint="Enter a complete course code, such as COMP2100."
            />
          )}
        </>
      ) : (
        <>
          <label className="matched-field">
            Course search
            <ReuiInput
              placeholder="e.g. COMP2100"
              aria-describedby="search-hint"
            />
            <span id="search-hint">Search by code or course name.</span>
          </label>
          <label className="matched-field">
            Semester
            <ReuiInput defaultValue="Semester 1, 2026" disabled={states} />
          </label>
          {states && (
            <label className="matched-field">
              Course code
              <ReuiInput
                defaultValue="COMP"
                aria-invalid="true"
                aria-describedby="code-error"
              />
              <span id="code-error">
                Enter a complete course code, such as COMP2100.
              </span>
            </label>
          )}
        </>
      )}
    </section>
  );
}
