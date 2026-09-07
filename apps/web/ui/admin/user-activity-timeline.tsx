"use client";
import { Badge } from "@coursemap/ui/components/badge";
import { Card } from "@coursemap/ui/primitives/card";
import { OptionPicker } from "@/ui/common/option-picker";

import { useState } from "react";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@coursemap/ui/components/timeline";

// Illustrative UI fixtures only. These events do not describe the viewed user.
const exampleEvents = [
  {
    id: "1",
    date: "2026-09-06T04:32:00Z",
    time: "6 Sep 2026, 2:32 pm",
    title: "Course added to plan",
    detail: "COMP2100 added to Semester 1, 2027.",
    category: "Study",
    actor: "Example student",
  },
  {
    id: "2",
    date: "2026-09-06T04:28:00Z",
    time: "6 Sep 2026, 2:28 pm",
    title: "Study load changed",
    detail: "Part time → Full time",
    category: "Study",
    actor: "Example student",
  },
  {
    id: "3",
    date: "2026-09-05T23:14:00Z",
    time: "6 Sep 2026, 9:14 am",
    title: "Signed in",
    detail: "Successful email and password sign-in.",
    category: "Account",
    actor: "Example student",
  },
  {
    id: "4",
    date: "2026-09-04T01:05:00Z",
    time: "4 Sep 2026, 11:05 am",
    title: "Role changed",
    detail: "User → Admin",
    category: "Access",
    actor: "Example administrator",
  },
  {
    id: "5",
    date: "2026-09-02T06:40:00Z",
    time: "2 Sep 2026, 4:40 pm",
    title: "Course completion recorded",
    detail: "COMP1100 marked as completed. 6 units earned.",
    category: "Study",
    actor: "Example student",
  },
  {
    id: "6",
    date: "2026-08-30T00:20:00Z",
    time: "30 Aug 2026, 10:20 am",
    title: "Onboarding completed",
    detail: "Bachelor of Computing selected as the primary degree plan.",
    category: "Account",
    actor: "Example student",
  },
  {
    id: "7",
    date: "2026-08-30T00:15:00Z",
    time: "30 Aug 2026, 10:15 am",
    title: "Account created",
    detail: "Student profile created with standard access.",
    category: "Account",
    actor: "System",
  },
] as const;

export function UserActivityTimeline() {
  const [category, setCategory] = useState("all");
  const events = exampleEvents.filter(
    (event) => category === "all" || event.category === category,
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Activity timeline</h2>
            <Badge variant={"warning-light"}>Mock data</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Illustrative events only. This is not this user&apos;s audit
            history.
          </p>
        </div>
        <OptionPicker
          value={"coursemap:" + String(category)}
          onValueChange={(nextValue) => {
            const option = (
              [
                { value: "all", label: "All events" },
                ...["Account", "Study", "Access"].map((value) => ({
                  value,
                  label: value,
                })),
              ] as const
            ).find(
              (option) => "coursemap:" + String(option.value) === nextValue,
            );
            if (option) setCategory(option.value);
          }}
          className={"w-40"}
          aria-label={"Filter activity"}
          onPointerDown={(event) => event.stopPropagation()}
          placeholder={"Select..."}
          items={[
            { value: "all", label: "All events" },
            ...["Account", "Study", "Access"].map((value) => ({
              value,
              label: value,
            })),
          ].map((option) => ({
            value: "coursemap:" + String(option.value),
            label: option.label,
          }))}
        />
      </div>
      <Card className="p-4 sm:p-5">
        <Timeline
          value={events.length}
          aria-label="Mock activity events"
          role="list"
        >
          {events.map((event, index) => (
            <TimelineItem key={event.id} step={index + 1} role="listitem">
              <TimelineHeader>
                <TimelineDate dateTime={event.date}>
                  {event.time} AEST
                </TimelineDate>
                <div className="flex flex-wrap items-center gap-2">
                  <TimelineTitle className="text-[13px]">
                    {event.title}
                  </TimelineTitle>
                  <Badge variant={"outline"}>{event.category}</Badge>
                </div>
              </TimelineHeader>
              <TimelineIndicator />
              <TimelineSeparator />
              <TimelineContent className="pt-1 text-[13px]">
                <p>{event.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {event.actor}
                </p>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Card>
    </div>
  );
}
