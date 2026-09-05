"use client";

import { Users01 } from "@untitledui/icons";
import { Avatar } from "@uui/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@uui/components/base/avatar/avatar-label-group";
import { AvatarAddButton } from "@uui/components/base/avatar/base-components/avatar-add-button";
import { advisers } from "../content";
import { Example, Grid, Stack, Variants } from "../section-frame";

const sizes = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export function AvatarsSection() {
  return (
    <Stack>
      <Example
        title="Sizes"
        description="Six sizes. Coursemap has no uploaded photos, so initials are the working default."
      >
        <div className="flex flex-col gap-6">
          <Variants label="Initials">
            {sizes.map((size) => (
              <Avatar key={size} size={size} initials="AO" alt="Amina Okafor" />
            ))}
          </Variants>
          <Variants label="Placeholder icon">
            {sizes.map((size) => (
              <Avatar key={size} size={size} placeholderIcon={Users01} />
            ))}
          </Variants>
          <Variants label="Rounded square">
            {sizes.map((size) => (
              <Avatar
                key={size}
                size={size}
                rounded
                initials="TN"
                alt="Tom Nguyen"
              />
            ))}
          </Variants>
        </div>
      </Example>

      <Example
        title="Status and badges"
        description="Online and offline indicators, verification ticks and overflow counts."
      >
        <Variants>
          <Avatar size="lg" initials="AO" alt="Amina Okafor" status="online" />
          <Avatar size="lg" initials="TN" alt="Tom Nguyen" status="offline" />
          <Avatar size="lg" initials="PR" alt="Priya Raghavan" verified />
          <Avatar size="lg" count={12} />
          <Avatar size="lg" contrastBorder initials="JW" alt="Jesse Whitlam" />
          <AvatarAddButton size="md" title="Invite an adviser" />
        </Variants>
      </Example>

      <Example
        title="Label groups"
        description="An avatar with a name and role, used in adviser lists and approval trails."
      >
        <Grid cols={2}>
          {advisers.map((adviser) => (
            <AvatarLabelGroup
              key={adviser.id}
              size="md"
              initials={adviser.initials}
              alt={adviser.name}
              title={adviser.name}
              subtitle={adviser.role}
            />
          ))}
        </Grid>
      </Example>

      <Example
        title="Stacked group"
        description="Overlapping avatars with a count, for shared plans and review queues."
      >
        <div className="flex items-center -space-x-2">
          {advisers.map((adviser) => (
            <Avatar
              key={adviser.id}
              size="md"
              contrastBorder
              initials={adviser.initials}
              alt={adviser.name}
              className="ring-bg-primary ring-2"
            />
          ))}
          <Avatar size="md" count={7} className="ring-bg-primary ring-2" />
        </div>
      </Example>
    </Stack>
  );
}
