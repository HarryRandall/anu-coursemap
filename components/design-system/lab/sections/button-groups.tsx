"use client";

import { useState } from "react";
import {
  Calendar,
  Copy01,
  Grid01,
  List,
  Rows01,
  Share07,
  Trash01,
} from "@untitledui/icons";
import { Button } from "@uui/components/base/buttons/button";
import {
  ButtonGroup,
  ButtonGroupItem,
} from "@uui/components/base/button-group/button-group";
import { ButtonUtility } from "@uui/components/base/buttons/button-utility";
import { CloseButton } from "@uui/components/base/buttons/close-button";
import { Example, Stack, Variants } from "../section-frame";

function ViewSwitcher() {
  const [view, setView] = useState<Set<string>>(() => new Set(["list"]));
  const current = [...view][0] ?? "list";

  return (
    <div className="flex flex-col gap-3">
      <ButtonGroup
        size="md"
        selectedKeys={view}
        onSelectionChange={(keys) => {
          const next = new Set([...keys].map(String));
          if (next.size > 0) setView(next);
        }}
      >
        <ButtonGroupItem id="list" iconLeading={List}>
          List
        </ButtonGroupItem>
        <ButtonGroupItem id="grid" iconLeading={Grid01}>
          Grid
        </ButtonGroupItem>
        <ButtonGroupItem id="timeline" iconLeading={Rows01}>
          Timeline
        </ButtonGroupItem>
        <ButtonGroupItem id="calendar" iconLeading={Calendar}>
          Calendar
        </ButtonGroupItem>
      </ButtonGroup>
      <p className="text-sm text-tertiary">
        Showing the plan as a{" "}
        <strong className="text-secondary">{current}</strong>.
      </p>
    </div>
  );
}

function SessionFilter() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["s1", "s2"]),
  );

  return (
    <div className="flex flex-col gap-3">
      <ButtonGroup
        size="sm"
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={(keys) =>
          setSelected(new Set([...keys].map(String)))
        }
      >
        <ButtonGroupItem id="summer">Summer</ButtonGroupItem>
        <ButtonGroupItem id="s1">Semester 1</ButtonGroupItem>
        <ButtonGroupItem id="winter">Winter</ButtonGroupItem>
        <ButtonGroupItem id="s2">Semester 2</ButtonGroupItem>
      </ButtonGroup>
      <p className="text-sm text-tertiary">
        {selected.size === 0
          ? "No teaching period selected."
          : `Filtering by ${[...selected].join(", ")}.`}
      </p>
    </div>
  );
}

export function ButtonGroupsSection() {
  return (
    <Stack>
      <Example
        title="Single selection"
        description="A segmented control. One option always stays selected."
      >
        <ViewSwitcher />
      </Example>

      <Example
        title="Multiple selection"
        description="The same component in multiple selection mode, driving a real filter."
      >
        <SessionFilter />
      </Example>

      <Example
        title="Sizes"
        description="Small, medium and large, with and without labels."
      >
        <div className="flex flex-col gap-6">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Variants key={size} label={size}>
              <ButtonGroup size={size} defaultSelectedKeys={["list"]}>
                <ButtonGroupItem id="list">List</ButtonGroupItem>
                <ButtonGroupItem id="grid">Grid</ButtonGroupItem>
                <ButtonGroupItem id="timeline">Timeline</ButtonGroupItem>
              </ButtonGroup>
              <ButtonGroup size={size} defaultSelectedKeys={["list"]}>
                <ButtonGroupItem
                  id="list"
                  iconLeading={List}
                  aria-label="List view"
                />
                <ButtonGroupItem
                  id="grid"
                  iconLeading={Grid01}
                  aria-label="Grid view"
                />
                <ButtonGroupItem
                  id="timeline"
                  iconLeading={Rows01}
                  aria-label="Timeline view"
                />
              </ButtonGroup>
            </Variants>
          ))}
        </div>
      </Example>

      <Example
        title="Utility buttons"
        description="Icon-only actions for table rows and card corners. Each carries a tooltip, so hover or focus one."
      >
        <div className="flex flex-col gap-6">
          <Variants label="Secondary">
            <ButtonUtility size="xs" icon={Copy01} tooltip="Copy course code" />
            <ButtonUtility size="sm" icon={Share07} tooltip="Share this plan" />
            <ButtonUtility size="sm" icon={Trash01} tooltip="Remove course" />
          </Variants>
          <Variants label="Tertiary">
            <ButtonUtility
              size="xs"
              color="tertiary"
              icon={Copy01}
              tooltip="Copy course code"
            />
            <ButtonUtility
              size="sm"
              color="tertiary"
              icon={Share07}
              tooltip="Share this plan"
            />
            <ButtonUtility
              size="sm"
              color="tertiary"
              icon={Trash01}
              tooltip="Remove course"
              isDisabled
            />
          </Variants>
          <Variants label="Close">
            <CloseButton size="sm" label="Dismiss" />
            <CloseButton size="md" label="Dismiss" />
            <CloseButton size="lg" label="Dismiss" />
            <CloseButton size="md" theme="dark" label="Dismiss" />
          </Variants>
        </div>
      </Example>

      <Example
        title="Link buttons"
        description="Link colours drop the container entirely and underline on hover."
      >
        <Variants>
          <Button color="link-gray">Cancel</Button>
          <Button color="link-color">View requirement</Button>
          <Button color="link-destructive">Delete this plan</Button>
          <Button color="link-color" isDisabled>
            Unavailable
          </Button>
        </Variants>
      </Example>
    </Stack>
  );
}
