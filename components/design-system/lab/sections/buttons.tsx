"use client";

import { useState } from "react";
import {
  ArrowRight,
  Download01,
  Plus,
  Trash01,
  UploadCloud02,
} from "@untitledui/icons";
import { Button } from "@uui/components/base/buttons/button";
import { Example, Stack, Variants } from "../section-frame";

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
const colors = [
  "primary",
  "secondary",
  "tertiary",
  "link-gray",
  "link-color",
] as const;
const destructive = [
  "primary-destructive",
  "secondary-destructive",
  "tertiary-destructive",
  "link-destructive",
] as const;

function LoadingDemo() {
  const [pending, setPending] = useState<string | null>(null);

  const run = (key: string) => {
    setPending(key);
    window.setTimeout(() => setPending(null), 1800);
  };

  return (
    <Variants>
      <Button
        color="primary"
        isLoading={pending === "save"}
        onClick={() => run("save")}
      >
        Save plan
      </Button>
      <Button
        color="secondary"
        showTextWhileLoading
        isLoading={pending === "export"}
        iconLeading={Download01}
        onClick={() => run("export")}
      >
        Export transcript
      </Button>
      <Button
        color="primary-destructive"
        isLoading={pending === "remove"}
        onClick={() => run("remove")}
      >
        Remove course
      </Button>
      <span className="text-sm text-tertiary">
        {pending ? "Working…" : "Press a button to see the loading state."}
      </span>
    </Variants>
  );
}

export function ButtonsSection() {
  return (
    <Stack>
      <Example
        title="Sizes"
        description="Five sizes. Interface density uses sm and md; xl is reserved for marketing surfaces."
      >
        <div className="flex flex-col gap-6">
          {colors.map((color) => (
            <Variants key={color} label={color}>
              {sizes.map((size) => (
                <Button key={size} size={size} color={color}>
                  Add to plan
                </Button>
              ))}
            </Variants>
          ))}
        </div>
      </Example>

      <Example
        title="Destructive"
        description="Destructive colours carry the error focus ring rather than the brand one."
      >
        <div className="flex flex-col gap-6">
          {destructive.map((color) => (
            <Variants key={color} label={color}>
              {sizes.map((size) => (
                <Button key={size} size={size} color={color}>
                  Drop course
                </Button>
              ))}
            </Variants>
          ))}
        </div>
      </Example>

      <Example
        title="With icons"
        description="Icons are passed as components so the button can size and colour them."
      >
        <div className="flex flex-col gap-6">
          <Variants label="Leading">
            <Button iconLeading={Plus}>Add course</Button>
            <Button color="secondary" iconLeading={UploadCloud02}>
              Import plan
            </Button>
            <Button color="tertiary" iconLeading={Download01}>
              Download
            </Button>
          </Variants>
          <Variants label="Trailing">
            <Button iconTrailing={ArrowRight}>Continue</Button>
            <Button color="secondary" iconTrailing={ArrowRight}>
              Review requirements
            </Button>
            <Button color="link-color" iconTrailing={ArrowRight}>
              See all 42 courses
            </Button>
          </Variants>
          <Variants label="Icon only">
            {sizes.map((size) => (
              <Button
                key={size}
                size={size}
                color="secondary"
                iconLeading={Plus}
                aria-label={`Add course, ${size}`}
              />
            ))}
            <Button
              color="secondary-destructive"
              iconLeading={Trash01}
              aria-label="Remove course"
            />
          </Variants>
        </div>
      </Example>

      <Example
        title="Loading"
        description="Loading swaps the label for a spinner and blocks pointer events. showTextWhileLoading keeps the label alongside it."
      >
        <LoadingDemo />
      </Example>

      <Example
        title="Disabled"
        description="Disabled buttons drop to 50 per cent opacity and are removed from the tab order by React Aria."
      >
        <Variants>
          {colors.map((color) => (
            <Button key={color} color={color} isDisabled>
              Add to plan
            </Button>
          ))}
          <Button color="primary-destructive" isDisabled>
            Drop course
          </Button>
        </Variants>
      </Example>

      <Example
        title="Links"
        description="Passing href renders a React Aria Link with the same styling and keyboard behaviour."
      >
        <Variants>
          <Button href="https://programsandcourses.anu.edu.au" target="_blank">
            Programs and Courses
          </Button>
          <Button
            color="secondary"
            href="https://programsandcourses.anu.edu.au"
            target="_blank"
            iconTrailing={ArrowRight}
          >
            Open handbook entry
          </Button>
          <Button
            color="link-color"
            href="https://programsandcourses.anu.edu.au"
            target="_blank"
          >
            View COMP1100
          </Button>
        </Variants>
      </Example>
    </Stack>
  );
}
