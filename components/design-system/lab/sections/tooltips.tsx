"use client";

import { HelpCircle, InfoCircle, Lock01 } from "@untitledui/icons";
import { Button } from "@uui/components/base/buttons/button";
import { ButtonUtility } from "@uui/components/base/buttons/button-utility";
import { Tooltip, TooltipTrigger } from "@uui/components/base/tooltip/tooltip";
import { Example, Stack, Variants } from "../section-frame";

const placements = [
  "top left",
  "top",
  "top right",
  "left",
  "right",
  "bottom left",
  "bottom",
  "bottom right",
] as const;

const iconTrigger =
  "group relative flex cursor-pointer flex-col items-center gap-2 text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover";

export function TooltipsSection() {
  return (
    <Stack>
      <Example
        title="Placements"
        description="Hover or focus each icon. Tooltips open on keyboard focus as well as pointer hover, and close on Escape."
      >
        <div className="grid grid-cols-2 gap-10 py-6 sm:grid-cols-4">
          {placements.map((placement) => (
            <div
              key={placement}
              className="flex flex-col items-center justify-center gap-2 text-center"
            >
              <Tooltip placement={placement} title={`Opens ${placement}`}>
                <TooltipTrigger className={iconTrigger}>
                  <HelpCircle className="size-5 stroke-[2.25px]" />
                </TooltipTrigger>
              </Tooltip>
              <span className="text-xs text-quaternary">{placement}</span>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="With supporting text"
        description="A title and a description, for explaining a rule rather than naming a control."
      >
        <div className="flex flex-wrap items-center gap-10 py-8">
          <Tooltip
            arrow
            title="Prerequisite satisfied"
            description="COMP2100 requires COMP1110. You completed COMP1110 in Semester 2, 2026."
          >
            <TooltipTrigger className={iconTrigger}>
              <InfoCircle className="size-5 stroke-[2.25px]" />
            </TooltipTrigger>
          </Tooltip>

          <Tooltip
            arrow={false}
            title="Census date"
            description="Drop a course before 31 March 2026 and it will not appear on your transcript."
          >
            <TooltipTrigger className={iconTrigger}>
              <HelpCircle className="size-5 stroke-[2.25px]" />
            </TooltipTrigger>
          </Tooltip>

          <Tooltip
            title="Locked"
            description="COMP3600 unlocks once COMP2100 and MATH1013 are complete."
          >
            <TooltipTrigger className={iconTrigger}>
              <Lock01 className="size-5 stroke-[2.25px]" />
            </TooltipTrigger>
          </Tooltip>
        </div>
      </Example>

      <Example
        title="On an existing control"
        description="Tooltip accepts any focusable child, so a Button can be the trigger directly rather than being nested inside TooltipTrigger."
      >
        <Variants className="gap-8 py-6">
          <Tooltip
            title="Adds every selected course to Semester 1, 2026"
            placement="top"
          >
            <Button color="secondary">Add to plan</Button>
          </Tooltip>

          <Tooltip
            title="Removes the course and clears its prerequisite links"
            placement="top"
          >
            <Button color="secondary-destructive">Drop course</Button>
          </Tooltip>

          <Tooltip title="Not available until the timetable is published">
            <Button color="secondary" isDisabled>
              Check clashes
            </Button>
          </Tooltip>
        </Variants>
      </Example>

      <Example
        title="On icon-only controls"
        description="Utility buttons carry a tooltip by default, which is how an icon-only control gets an accessible name."
      >
        <Variants className="gap-6 py-6">
          <ButtonUtility
            size="sm"
            icon={HelpCircle}
            tooltip="Read the requirement rule"
          />
          <ButtonUtility
            size="sm"
            color="tertiary"
            icon={Lock01}
            tooltip="Locked until COMP2100 is complete"
          />
          <Tooltip
            title="Course code"
            description="Codes come from the published ANU catalogue and cannot be edited."
          >
            <TooltipTrigger className="cursor-help rounded-sm font-mono text-sm text-secondary underline decoration-dotted underline-offset-4">
              COMP1100
            </TooltipTrigger>
          </Tooltip>
        </Variants>
      </Example>

      <Example
        title="Delay"
        description="The default delay is 300ms. A zero delay suits dense toolbars."
      >
        <Variants className="gap-10 py-6">
          <div className="flex flex-col items-center gap-2">
            <Tooltip title="Default 300ms delay">
              <TooltipTrigger className={iconTrigger}>
                <HelpCircle className="size-5 stroke-[2.25px]" />
              </TooltipTrigger>
            </Tooltip>
            <span className="text-xs text-quaternary">300ms</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Tooltip title="Opens immediately" delay={0}>
              <TooltipTrigger className={iconTrigger}>
                <HelpCircle className="size-5 stroke-[2.25px]" />
              </TooltipTrigger>
            </Tooltip>
            <span className="text-xs text-quaternary">0ms</span>
          </div>
        </Variants>
      </Example>
    </Stack>
  );
}
