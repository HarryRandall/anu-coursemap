"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Side = "top" | "bottom";

type TriggerProps = {
  disabled?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerEnter?: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: React.PointerEvent<HTMLElement>) => void;
};

/**
 * Hover and focus label for a control whose icon carries all its meaning.
 *
 * This replaces the browser's own `title` popup, which arrives after about a
 * second, cannot be styled, and never appears for keyboard users at all. The
 * trigger is cloned rather than wrapped so no extra box enters the layout,
 * and the label is portalled to the body so a scrolling or clipping ancestor
 * cannot cut it off.
 *
 * Pass the same text as `aria-label` on the control: this is a visual
 * affordance, not an accessible name.
 */
export function Tooltip({
  children,
  content,
  side = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  side?: Side;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const child = Children.only(children);

  if (!isValidElement(child)) return <>{children}</>;
  const trigger = child as ReactElement<TriggerProps>;

  function show(event: { currentTarget: HTMLElement }) {
    setAnchor(event.currentTarget.getBoundingClientRect());
  }

  const clone = cloneElement(trigger, {
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      trigger.props.onBlur?.(event);
      setAnchor(null);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      trigger.props.onFocus?.(event);
      show(event);
    },
    // A click has already said what the control does, so the label gets out
    // of the way rather than hanging over the menu it just opened.
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      trigger.props.onPointerDown?.(event);
      setAnchor(null);
    },
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
      trigger.props.onPointerEnter?.(event);
      show(event);
    },
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
      trigger.props.onPointerLeave?.(event);
      setAnchor(null);
    },
  });

  // A disabled control sets pointer-events: none and never reports a hover,
  // which is exactly when its label matters most — so it gets a wrapper that
  // can still hear the pointer.
  const anchored = trigger.props.disabled ? (
    <span
      className="inline-flex"
      onPointerEnter={show}
      onPointerLeave={() => setAnchor(null)}
    >
      {trigger}
    </span>
  ) : (
    clone
  );

  return (
    <>
      {anchored}
      {anchor && typeof document !== "undefined"
        ? createPortal(
            <span
              className={cn(
                "pointer-events-none fixed z-[200] -translate-x-1/2 animate-fade-in rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg motion-reduce:animate-none",
                side === "top" ? "-translate-y-full" : "",
              )}
              role="tooltip"
              style={{
                left: anchor.left + anchor.width / 2,
                top: side === "top" ? anchor.top - 8 : anchor.bottom + 8,
              }}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
