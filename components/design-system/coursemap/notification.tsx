"use client";

import type { FC, ReactNode } from "react";
import { AlertCircle, CheckCircle, InfoCircle } from "@untitledui/icons";
import { toast as sonner } from "sonner";
import { Button } from "@uui/components/base/buttons/button";
import { CloseButton } from "@uui/components/base/buttons/close-button";
import { FeaturedIcon } from "@uui/components/foundations/featured-icon/featured-icon";

/**
 * Adapted. Untitled UI's notification component is PRO-only. The layout here is
 * assembled from the free FeaturedIcon, Button and CloseButton primitives on
 * Untitled UI's semantic tokens. Sonner supplies the queue, stacking, timing
 * and swipe-to-dismiss behaviour.
 */

export type NotificationIntent = "brand" | "success" | "warning" | "error";

const intents: Record<
  NotificationIntent,
  { icon: FC<{ className?: string }>; color: NotificationIntent }
> = {
  brand: { icon: InfoCircle, color: "brand" },
  success: { icon: CheckCircle, color: "success" },
  warning: { icon: AlertCircle, color: "warning" },
  error: { icon: AlertCircle, color: "error" },
};

export function NotificationCard({
  intent = "brand",
  title,
  description,
  primaryAction,
  secondaryAction,
  onDismiss,
}: {
  intent?: NotificationIntent;
  title: string;
  description?: ReactNode;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  onDismiss: () => void;
}) {
  const config = intents[intent];

  return (
    <div className="flex w-full max-w-100 gap-4 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary">
      <FeaturedIcon
        size="md"
        color={config.color}
        theme="outline"
        icon={config.icon}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-primary">{title}</p>
          {description && (
            <p className="text-sm text-tertiary">{description}</p>
          )}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex items-center gap-3">
            {secondaryAction && (
              <Button
                size="sm"
                color="link-gray"
                onClick={() => {
                  secondaryAction.onPress();
                  onDismiss();
                }}
              >
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                size="sm"
                color="link-color"
                onClick={() => {
                  primaryAction.onPress();
                  onDismiss();
                }}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>

      <CloseButton
        size="sm"
        label="Dismiss notification"
        slot={null}
        onPress={onDismiss}
        className="-mt-1 -mr-1 shrink-0"
      />
    </div>
  );
}

type NotifyOptions = {
  intent?: NotificationIntent;
  description?: ReactNode;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  duration?: number;
};

/** Raise a notification. Returns the Sonner id so callers can dismiss it. */
export function notify(title: string, options: NotifyOptions = {}) {
  const { duration = 6000, ...rest } = options;

  return sonner.custom(
    (id) => (
      <NotificationCard
        {...rest}
        title={title}
        onDismiss={() => sonner.dismiss(id)}
      />
    ),
    { duration },
  );
}

export const dismissAllNotifications = () => sonner.dismiss();
