"use client";

import type { FC, ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  InfoCircle,
} from "@untitledui/icons";
import { Button } from "@uui/components/base/buttons/button";
import { CloseButton } from "@uui/components/base/buttons/close-button";
import { FeaturedIcon } from "@uui/components/foundations/featured-icon/featured-icon";
import { cx } from "@uui/utils/cx";

/**
 * Adapted. Untitled UI's alert component is PRO-only and has no public MIT
 * source, so this is assembled from the free FeaturedIcon, Button and
 * CloseButton primitives.
 *
 * The surface deliberately avoids the `bg-*-primary` tokens: in dark mode
 * `--color-bg-brand-primary` resolves to brand-500, which is a saturated fill
 * meant for badges, not a readable alert ground. Tints use the utility ramps
 * instead, which invert step for step between themes.
 */

export type AlertIntent = "brand" | "success" | "warning" | "error";
export type AlertTone = "card" | "subtle" | "accent";

type IntentConfig = {
  icon: FC<{ className?: string }>;
  featured: "brand" | "success" | "warning" | "error";
  tint: string;
  tintRing: string;
  accent: string;
  action: "link-color" | "link-destructive";
};

const intents: Record<AlertIntent, IntentConfig> = {
  brand: {
    icon: InfoCircle,
    featured: "brand",
    tint: "bg-utility-brand-50",
    tintRing: "ring-utility-brand-200",
    accent: "bg-utility-brand-600",
    action: "link-color",
  },
  success: {
    icon: CheckCircle,
    featured: "success",
    tint: "bg-utility-green-50",
    tintRing: "ring-utility-green-200",
    accent: "bg-utility-green-600",
    action: "link-color",
  },
  warning: {
    icon: AlertTriangle,
    featured: "warning",
    tint: "bg-utility-yellow-50",
    tintRing: "ring-utility-yellow-200",
    accent: "bg-utility-yellow-600",
    action: "link-color",
  },
  error: {
    icon: AlertCircle,
    featured: "error",
    tint: "bg-utility-red-50",
    tintRing: "ring-utility-red-200",
    accent: "bg-utility-red-600",
    action: "link-destructive",
  },
};

export type AlertAction = {
  label: string;
  /** Navigates. Renders the action as a link rather than a button. */
  href?: string;
  onPress?: () => void;
};

export function Alert({
  intent = "brand",
  tone = "card",
  title,
  children,
  actions,
  onDismiss,
  className,
}: {
  intent?: AlertIntent;
  /**
   * `card` is a neutral surface with a coloured icon, `subtle` adds a utility
   * tint, `accent` keeps the neutral surface and marks the intent with a rule.
   */
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  actions?: AlertAction[];
  onDismiss?: () => void;
  className?: string;
}) {
  const config = intents[intent];

  return (
    <div
      role={intent === "error" ? "alert" : "status"}
      className={cx(
        "relative flex w-full gap-3 overflow-hidden rounded-xl p-4 ring-1",
        tone === "subtle"
          ? cx(config.tint, config.tintRing)
          : "bg-primary shadow-xs ring-secondary",
        tone === "accent" && "pl-5",
        className,
      )}
    >
      {tone === "accent" && (
        <span
          aria-hidden="true"
          className={cx("absolute inset-y-0 left-0 w-1", config.accent)}
        />
      )}

      <FeaturedIcon
        size="md"
        color={config.featured}
        theme={tone === "subtle" ? "outline" : "light"}
        icon={config.icon}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-primary">{title}</p>
          {children && <div className="text-tertiary text-sm">{children}</div>}
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            {actions.map((action, index) =>
              action.href ? (
                <Button
                  key={action.label}
                  size="sm"
                  color={index === 0 ? config.action : "link-gray"}
                  href={action.href}
                >
                  {action.label}
                </Button>
              ) : (
                <Button
                  key={action.label}
                  size="sm"
                  color={index === 0 ? config.action : "link-gray"}
                  onClick={action.onPress}
                >
                  {action.label}
                </Button>
              ),
            )}
          </div>
        )}
      </div>

      {onDismiss && (
        <CloseButton
          size="sm"
          label="Dismiss"
          slot={null}
          onPress={onDismiss}
          className="-mt-1 -mr-1 shrink-0"
        />
      )}
    </div>
  );
}
