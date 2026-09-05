"use client";

import { useState } from "react";
import { Alert } from "@/components/design-system/coursemap/alert";
import { Button } from "@uui/components/base/buttons/button";
import { Example, FidelityNote, Stack } from "../section-frame";

const seeded = ["prereq", "census", "import", "quota"];

function DismissibleAlerts() {
  const [visible, setVisible] = useState<string[]>(seeded);

  const dismiss = (id: string) =>
    setVisible((current) => current.filter((entry) => entry !== id));

  return (
    <div className="flex flex-col gap-4">
      {visible.includes("prereq") && (
        <Alert
          intent="brand"
          title="COMP3600 is now available"
          onDismiss={() => dismiss("prereq")}
          actions={[
            { label: "Add to plan", onPress: () => dismiss("prereq") },
            { label: "Not now", onPress: () => dismiss("prereq") },
          ]}
        >
          Completing COMP2100 satisfied the last prerequisite for Algorithms.
        </Alert>
      )}

      {visible.includes("census") && (
        <Alert
          intent="warning"
          title="Census date is in 6 days"
          onDismiss={() => dismiss("census")}
          actions={[
            { label: "Review my plan", onPress: () => dismiss("census") },
          ]}
        >
          Courses dropped after 31 March 2026 stay on your transcript and
          continue to incur fees.
        </Alert>
      )}

      {visible.includes("import") && (
        <Alert
          intent="success"
          title="2026 catalogue imported"
          onDismiss={() => dismiss("import")}
        >
          1,284 courses and 96 programmes were refreshed from Programs and
          Courses.
        </Alert>
      )}

      {visible.includes("quota") && (
        <Alert
          intent="error"
          title="ENGN2218 is full"
          onDismiss={() => dismiss("quota")}
          actions={[
            { label: "Join the waitlist", onPress: () => dismiss("quota") },
            { label: "Find an alternative", onPress: () => dismiss("quota") },
          ]}
        >
          All 200 places are taken. Electronic Systems and Design also runs in
          Semester 2, 2027.
        </Alert>
      )}

      {visible.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-secondary p-6">
          <p className="text-sm text-tertiary">
            Every alert has been dismissed.
          </p>
          <Button
            size="sm"
            color="secondary"
            onClick={() => setVisible(seeded)}
          >
            Bring them back
          </Button>
        </div>
      )}
    </div>
  );
}

export function AlertsSection() {
  return (
    <Stack>
      <FidelityNote>
        Untitled UI&rsquo;s alert component is PRO-only. This is composed from
        the free FeaturedIcon, Button and CloseButton primitives on the same
        semantic tokens, so it inherits the theme and the focus behaviour but is
        not a copy of the paid component.
      </FidelityNote>

      <Example
        title="Intents"
        description="Every alert here is dismissible and every action really fires. Dismiss them all to reach the empty state."
      >
        <DismissibleAlerts />
      </Example>

      <Example
        title="Without actions"
        description="A statement rather than a prompt."
      >
        <div className="flex flex-col gap-4">
          <Alert intent="brand" title="Plan saved automatically" />
          <Alert intent="success" title="Prerequisites all satisfied">
            Every course in your 2026 plan has its requisite rule met.
          </Alert>
        </div>
      </Example>

      <Example
        title="Tones"
        description="Card is the default neutral surface. Subtle adds a utility tint that inverts correctly in dark mode. Accent marks the intent with a rule instead of a fill."
      >
        <div className="flex flex-col gap-4">
          {(["card", "subtle", "accent"] as const).map((tone) => (
            <Alert
              key={tone}
              tone={tone}
              intent="warning"
              title={`Timetable not published (${tone})`}
              actions={[{ label: "Notify me", onPress: () => undefined }]}
            >
              Semester 2 times appear in June. Clash detection is unavailable
              until then.
            </Alert>
          ))}
        </div>
      </Example>

      <Example
        title="Subtle tint, every intent"
        description="The tinted tone across all four intents, for banners that need to stand out from a busy page."
      >
        <div className="flex flex-col gap-4">
          <Alert tone="subtle" intent="brand" title="COMP3600 is now available">
            Completing COMP2100 satisfied the last prerequisite.
          </Alert>
          <Alert tone="subtle" intent="success" title="Plan saved">
            Your 2026 plan was saved a moment ago.
          </Alert>
          <Alert
            tone="subtle"
            intent="warning"
            title="Census date is in 6 days"
          >
            Courses dropped after 31 March 2026 stay on your transcript.
          </Alert>
          <Alert tone="subtle" intent="error" title="ENGN2218 is full">
            All 200 places are taken.
          </Alert>
        </div>
      </Example>
    </Stack>
  );
}
