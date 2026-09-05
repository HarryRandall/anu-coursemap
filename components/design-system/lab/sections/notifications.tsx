"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import {
  NotificationCard,
  dismissAllNotifications,
  notify,
} from "@/components/design-system/coursemap/notification";
import { Button } from "@uui/components/base/buttons/button";
import { useLabTheme } from "../lab-theme-provider";
import { Example, FidelityNote, Stack, Variants } from "../section-frame";

function Triggers() {
  const [log, setLog] = useState<string[]>([]);
  const record = (entry: string) =>
    setLog((current) => [entry, ...current].slice(0, 5));

  return (
    <div className="flex flex-col gap-4">
      <Variants>
        <Button
          color="secondary"
          onClick={() =>
            notify("Plan saved", {
              intent: "success",
              description: "Your 2026 plan was saved 2 seconds ago.",
            })
          }
        >
          Success
        </Button>

        <Button
          color="secondary"
          onClick={() =>
            notify("COMP3600 unlocked", {
              intent: "brand",
              description:
                "Completing COMP2100 satisfied the last prerequisite.",
              primaryAction: {
                label: "Add to plan",
                onPress: () => record("Added COMP3600 to the plan"),
              },
              secondaryAction: {
                label: "Dismiss",
                onPress: () => record("Dismissed the COMP3600 prompt"),
              },
            })
          }
        >
          With actions
        </Button>

        <Button
          color="secondary"
          onClick={() =>
            notify("Census date approaching", {
              intent: "warning",
              description: "6 days until 31 March 2026.",
              duration: 10000,
            })
          }
        >
          Warning
        </Button>

        <Button
          color="secondary-destructive"
          onClick={() =>
            notify("Import failed", {
              intent: "error",
              description:
                "Programs and Courses returned 503 on 12 of 1,284 courses.",
              primaryAction: {
                label: "Retry import",
                onPress: () => record("Retried the catalogue import"),
              },
              duration: Infinity,
            })
          }
        >
          Error, persistent
        </Button>

        <Button color="link-gray" onClick={dismissAllNotifications}>
          Dismiss all
        </Button>
      </Variants>

      <div className="rounded-lg bg-secondary p-4">
        {log.length === 0 ? (
          <p className="text-tertiary text-sm">
            No notification action taken yet. Raise one with actions and press
            its link.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {log.map((entry, index) => (
              <li key={index} className="text-sm text-secondary">
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function NotificationsSection() {
  const { resolved } = useLabTheme();

  return (
    <Stack>
      <FidelityNote>
        Untitled UI&rsquo;s notification component is PRO-only. The card is
        composed here from the free FeaturedIcon, Button and CloseButton
        primitives; Sonner supplies the queue, stacking, timing and
        swipe-to-dismiss behaviour.
      </FidelityNote>

      <Toaster
        position="bottom-right"
        theme={resolved}
        visibleToasts={4}
        toastOptions={{ unstyled: true, classNames: { toast: "w-full" } }}
      />

      <Example
        title="Raise a notification"
        description="Each button raises a real toast. They stack, expire on their own timer, can be swiped away and can be dismissed individually or all at once."
      >
        <Triggers />
      </Example>

      <Example
        title="Card anatomy"
        description="The same card rendered inline, so the four intents can be compared without waiting for a timer."
      >
        <div className="flex flex-col gap-4">
          <NotificationCard
            intent="brand"
            title="COMP3600 unlocked"
            description="Completing COMP2100 satisfied the last prerequisite."
            primaryAction={{ label: "Add to plan", onPress: () => undefined }}
            secondaryAction={{ label: "Dismiss", onPress: () => undefined }}
            onDismiss={() => undefined}
          />
          <NotificationCard
            intent="success"
            title="Plan saved"
            description="Your 2026 plan was saved 2 seconds ago."
            onDismiss={() => undefined}
          />
          <NotificationCard
            intent="warning"
            title="Census date approaching"
            description="6 days until 31 March 2026."
            onDismiss={() => undefined}
          />
          <NotificationCard
            intent="error"
            title="Import failed"
            description="Programs and Courses returned 503 on 12 of 1,284 courses."
            primaryAction={{ label: "Retry import", onPress: () => undefined }}
            onDismiss={() => undefined}
          />
        </div>
      </Example>
    </Stack>
  );
}
