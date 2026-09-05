"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Clock, Lock01 } from "@untitledui/icons";
import {
  Badge,
  BadgeWithDot,
  BadgeWithIcon,
} from "@uui/components/base/badges/badges";
import { BadgeGroup } from "@uui/components/base/badges/badge-groups";
import { Tag, TagGroup, TagList } from "@uui/components/base/tags/tags";
import { colleges, sessions } from "../content";
import { Example, Stack, Variants } from "../section-frame";

const colors = [
  "gray",
  "brand",
  "error",
  "warning",
  "success",
  "blue",
  "indigo",
  "purple",
  "orange",
  "pink",
  "sky",
  "slate",
] as const;

const sizes = ["sm", "md", "lg"] as const;

const statusBadges = [
  { color: "success", icon: CheckCircle, label: "Completed" },
  { color: "brand", icon: Clock, label: "Enrolled" },
  { color: "blue", icon: Clock, label: "Planned" },
  { color: "warning", icon: AlertCircle, label: "Review required" },
  { color: "gray", icon: Lock01, label: "Prerequisites unmet" },
] as const;

function DismissibleTags() {
  const [tags, setTags] = useState(() =>
    colleges.slice(0, 4).map((college) => ({
      id: college.id,
      label: college.label,
    })),
  );

  return (
    <div className="flex flex-col gap-3">
      <TagGroup label="Filtered colleges" size="md">
        <TagList className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Tag
              key={tag.id}
              id={tag.id}
              onClose={(id) =>
                setTags((current) => current.filter((item) => item.id !== id))
              }
            >
              {tag.label}
            </Tag>
          ))}
        </TagList>
      </TagGroup>

      {tags.length === 0 && (
        <p className="text-sm text-tertiary">
          Every college filter has been removed.
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          setTags(
            colleges.slice(0, 4).map((college) => ({
              id: college.id,
              label: college.label,
            })),
          )
        }
        className="self-start rounded-sm text-sm font-semibold text-brand-secondary underline underline-offset-3 outline-focus-ring hover:text-brand-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Reset filters
      </button>
    </div>
  );
}

function SelectableTags() {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["2026-s1"]),
  );

  return (
    <div className="flex flex-col gap-3">
      <TagGroup
        label="Teaching periods"
        size="md"
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={(keys) =>
          setSelected(new Set([...keys].map(String)))
        }
      >
        <TagList className="flex flex-wrap gap-2">
          {sessions.map((session) => (
            <Tag key={session.id} id={session.id}>
              {session.label}
            </Tag>
          ))}
        </TagList>
      </TagGroup>
      <p className="text-sm text-tertiary">
        {selected.size === 0
          ? "No teaching period selected."
          : `${selected.size} of ${sessions.length} periods selected.`}
      </p>
    </div>
  );
}

export function BadgesSection() {
  return (
    <Stack>
      <Example
        title="Colours"
        description="Twelve colours across three badge types. Colour never carries meaning on its own in Coursemap, so pair it with a label or icon."
      >
        <div className="flex flex-col gap-6">
          <Variants label="Pill colour">
            {colors.map((color) => (
              <Badge key={color} type="pill-color" color={color}>
                {color}
              </Badge>
            ))}
          </Variants>
          <Variants label="Colour">
            {colors.map((color) => (
              <Badge key={color} type="color" color={color}>
                {color}
              </Badge>
            ))}
          </Variants>
          <Variants label="Modern">
            {colors.map((color) => (
              <Badge key={color} type="modern">
                {color}
              </Badge>
            ))}
          </Variants>
        </div>
      </Example>

      <Example title="Sizes" description="Small, medium and large.">
        <div className="flex flex-col gap-6">
          {sizes.map((size) => (
            <Variants key={size} label={size}>
              <Badge size={size} type="pill-color" color="brand">
                6 units
              </Badge>
              <BadgeWithDot size={size} type="pill-color" color="success">
                Completed
              </BadgeWithDot>
              <BadgeWithIcon
                size={size}
                type="pill-color"
                color="warning"
                iconLeading={AlertCircle}
              >
                Review required
              </BadgeWithIcon>
            </Variants>
          ))}
        </div>
      </Example>

      <Example
        title="Course status"
        description="The five states a course can hold in a plan. Each pairs an icon with a label so status survives a monochrome print."
      >
        <Variants>
          {statusBadges.map((badge) => (
            <BadgeWithIcon
              key={badge.label}
              size="md"
              type="pill-color"
              color={badge.color}
              iconLeading={badge.icon}
            >
              {badge.label}
            </BadgeWithIcon>
          ))}
        </Variants>
      </Example>

      <Example
        title="Badge groups"
        description="A badge paired with supporting text, used for inline announcements."
      >
        <div className="flex flex-col items-start gap-4">
          <BadgeGroup addonText="2026 catalogue" size="md" color="brand">
            Course data refreshed 2 hours ago
          </BadgeGroup>
          <BadgeGroup
            addonText="Trailing"
            size="md"
            color="success"
            theme="modern"
            align="trailing"
          >
            Plan validated against published rules
          </BadgeGroup>
        </div>
      </Example>

      <Example
        title="Dismissible tags"
        description="Removing a tag removes the filter. Press Backspace or Delete on a focused tag to dismiss it with the keyboard."
      >
        <DismissibleTags />
      </Example>

      <Example
        title="Selectable tags"
        description="Multiple selection with real state. Arrow keys move between tags; Space toggles."
      >
        <SelectableTags />
      </Example>
    </Stack>
  );
}
