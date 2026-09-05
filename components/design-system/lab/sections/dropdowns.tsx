"use client";

import { useState } from "react";
import {
  ChevronDown,
  Copy01,
  Download01,
  Edit01,
  FilterLines,
  Share07,
  Trash01,
} from "@untitledui/icons";
import { Button } from "@uui/components/base/buttons/button";
import { Dropdown } from "@uui/components/base/dropdown/dropdown";
import { Example, Stack, Variants } from "../section-frame";

function ActionMenu() {
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Variants>
        <Dropdown.Root>
          <Button color="secondary" iconTrailing={ChevronDown}>
            Course actions
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              onAction={(key) => setLast(String(key))}
              disabledKeys={["delete"]}
            >
              <Dropdown.Item id="edit" icon={Edit01} addon="⌘E">
                Edit plan entry
              </Dropdown.Item>
              <Dropdown.Item id="copy" icon={Copy01} addon="⌘C">
                Copy course code
              </Dropdown.Item>
              <Dropdown.Item id="share" icon={Share07}>
                Share with adviser
              </Dropdown.Item>
              <Dropdown.Separator />
              <Dropdown.Item id="delete" icon={Trash01}>
                Remove from plan
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        <Dropdown.Root>
          <Dropdown.DotsButton />
          <Dropdown.Popover className="w-min">
            <Dropdown.Menu onAction={(key) => setLast(String(key))}>
              <Dropdown.Item id="edit-row" icon={Edit01}>
                Edit
              </Dropdown.Item>
              <Dropdown.Item id="duplicate-row" icon={Copy01}>
                Duplicate
              </Dropdown.Item>
              <Dropdown.Item id="delete-row" icon={Trash01}>
                Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </Variants>

      <p className="text-tertiary text-sm">
        {last
          ? `Last action: ${last}. "Remove from plan" is disabled and cannot be chosen.`
          : "Open a menu and choose an item. The result appears here."}
      </p>
    </div>
  );
}

function SectionedMenu() {
  return (
    <Dropdown.Root>
      <Button color="secondary" iconLeading={FilterLines}>
        Filter courses
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Section>
            <Dropdown.SectionHeader className="text-quaternary px-3 pt-2 pb-1 text-xs font-semibold">
              Status
            </Dropdown.SectionHeader>
            <Dropdown.Item id="completed">Completed</Dropdown.Item>
            <Dropdown.Item id="enrolled">Enrolled</Dropdown.Item>
            <Dropdown.Item id="planned">Planned</Dropdown.Item>
          </Dropdown.Section>
          <Dropdown.Separator />
          <Dropdown.Section>
            <Dropdown.SectionHeader className="text-quaternary px-3 pt-2 pb-1 text-xs font-semibold">
              Teaching period
            </Dropdown.SectionHeader>
            <Dropdown.Item id="s1">Semester 1, 2026</Dropdown.Item>
            <Dropdown.Item id="s2">Semester 2, 2026</Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}

function SelectionMenu() {
  const [statuses, setStatuses] = useState<Set<string>>(
    () => new Set(["completed", "enrolled"]),
  );
  const [sort, setSort] = useState<Set<string>>(() => new Set(["code"]));

  return (
    <div className="flex flex-col gap-3">
      <Variants>
        <Dropdown.Root>
          <Button color="secondary" iconTrailing={ChevronDown}>
            Status ({statuses.size})
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              selectionMode="multiple"
              selectedKeys={statuses}
              onSelectionChange={(keys) =>
                setStatuses(new Set([...keys].map(String)))
              }
            >
              <Dropdown.Item id="completed" selectionIndicator="checkbox">
                Completed
              </Dropdown.Item>
              <Dropdown.Item id="enrolled" selectionIndicator="checkbox">
                Enrolled
              </Dropdown.Item>
              <Dropdown.Item id="planned" selectionIndicator="checkbox">
                Planned
              </Dropdown.Item>
              <Dropdown.Item id="locked" selectionIndicator="checkbox">
                Prerequisites unmet
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>

        <Dropdown.Root>
          <Button color="secondary" iconTrailing={ChevronDown}>
            Sort by {[...sort][0]}
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={sort}
              onSelectionChange={(keys) =>
                setSort(new Set([...keys].map(String)))
              }
            >
              <Dropdown.Item id="code" selectionIndicator="radio">
                Course code
              </Dropdown.Item>
              <Dropdown.Item id="title" selectionIndicator="radio">
                Title
              </Dropdown.Item>
              <Dropdown.Item id="units" selectionIndicator="radio">
                Units
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </Variants>

      <p className="text-tertiary text-sm">
        Showing {statuses.size === 0 ? "no" : [...statuses].join(", ")} courses,
        sorted by {[...sort][0]}.
      </p>
    </div>
  );
}

export function DropdownsSection() {
  return (
    <Stack>
      <Example
        title="Action menu"
        description="Open with Enter or Space, move with the arrow keys, choose with Enter, dismiss with Escape. Focus returns to the trigger."
      >
        <ActionMenu />
      </Example>

      <Example
        title="Sections"
        description="Grouped items with headers and separators."
      >
        <SectionedMenu />
      </Example>

      <Example
        title="Selection indicators"
        description="Checkbox and radio indicators drive real filter and sort state."
      >
        <SelectionMenu />
      </Example>

      <Example
        title="Item anatomy"
        description="Icons, keyboard shortcut addons and disabled items."
      >
        <Dropdown.Root>
          <Button color="secondary" iconTrailing={ChevronDown}>
            Export
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu disabledKeys={["ics"]}>
              <Dropdown.Item id="pdf" icon={Download01} addon="⌘P">
                PDF transcript
              </Dropdown.Item>
              <Dropdown.Item id="csv" icon={Download01} addon="⌘S">
                CSV of course rows
              </Dropdown.Item>
              <Dropdown.Item id="ics" icon={Download01}>
                Calendar file
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </Example>
    </Stack>
  );
}
