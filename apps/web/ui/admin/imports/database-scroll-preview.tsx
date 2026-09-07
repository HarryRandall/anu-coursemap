"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./database-scroll-preview.module.css";

export function DatabaseScrollPreview({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);
  const [metrics, setMetrics] = useState({ height: 0, content: 0, top: 0 });

  useLayoutEffect(() => {
    const element = viewport.current;
    const body = content.current;
    if (!element || !body) return;
    const measure = () =>
      setMetrics({
        height: element.clientHeight,
        content: element.scrollHeight,
        top: element.scrollTop,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(body);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, []);

  const maximum = Math.max(0, metrics.content - metrics.height);
  const trackHeight = Math.max(0, metrics.height - 4);
  const thumbHeight = Math.min(
    trackHeight,
    72,
    Math.max(24, (trackHeight * metrics.height) / (metrics.content || 1)),
  );
  const travel = trackHeight - thumbHeight;
  const thumbTop = maximum
    ? (Math.min(maximum, Math.max(0, metrics.top)) / maximum) * travel
    : 0;

  function movePointer(clientY: number, track: HTMLDivElement, offset: number) {
    if (!viewport.current || travel <= 0) return;
    const position = clientY - track.getBoundingClientRect().top - 2 - offset;
    viewport.current.scrollTop =
      Math.max(0, Math.min(1, position / travel)) * maximum;
  }

  return (
    <div
      role={label ? "region" : undefined}
      aria-label={label}
      className={cn(styles.root, className)}
    >
      <div ref={viewport} id={id} tabIndex={0} className={styles.viewport}>
        <div ref={content}>{children}</div>
      </div>
      {maximum > 0 && (
        <div
          role="scrollbar"
          aria-label={`${label ?? "Database tables"} scrollbar`}
          aria-controls={id}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={Math.round(maximum)}
          aria-valuenow={Math.round(
            Math.max(0, Math.min(maximum, metrics.top)),
          )}
          tabIndex={0}
          className={styles.track}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            const offset =
              event.target === event.currentTarget
                ? thumbHeight / 2
                : event.clientY -
                  event.currentTarget.getBoundingClientRect().top -
                  2 -
                  thumbTop;
            drag.current = { pointer: event.pointerId, offset };
            event.currentTarget.setPointerCapture(event.pointerId);
            movePointer(event.clientY, event.currentTarget, offset);
          }}
          onPointerMove={(event) => {
            if (drag.current?.pointer === event.pointerId)
              movePointer(
                event.clientY,
                event.currentTarget,
                drag.current.offset,
              );
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onKeyDown={(event) => {
            const element = viewport.current;
            if (!element) return;
            const positions: Record<string, number> = {
              ArrowDown: element.scrollTop + 40,
              ArrowUp: element.scrollTop - 40,
              PageDown: element.scrollTop + element.clientHeight,
              PageUp: element.scrollTop - element.clientHeight,
              Home: 0,
              End: maximum,
            };
            if (event.key in positions) {
              event.preventDefault();
              element.scrollTop = positions[event.key];
            }
          }}
        >
          <div
            className={styles.thumb}
            style={{
              height: thumbHeight,
              transform: `translateY(${thumbTop}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
