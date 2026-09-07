"use client";

import { useContext, useLayoutEffect, useRef } from "react";
import { LoadingProgressContext } from "./loading-progress-provider";

export function useLoadingProgress(loading: boolean) {
  const header = useRef<HTMLElement>(null);
  const progressRef = useContext(LoadingProgressContext);
  const completion = useRef<{ transform: string; capturedAt: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const element = header.current;
    if (!element || !progressRef) return;

    if (loading) {
      progressRef.current = null;
      completion.current = null;
      return () => {
        // The fallback header unmounts before the loaded page mounts its header.
        progressRef.current = {
          transform: getComputedStyle(element, "::after").transform,
          capturedAt: performance.now(),
        };
      };
    }

    const previous = progressRef.current ?? completion.current;
    completion.current = previous;
    progressRef.current = null;
    if (!previous || performance.now() - previous.capturedAt > 1000) return;
    if (!element.animate) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animation = element.animate(
      [
        {
          transform: reducedMotion ? "scaleX(1)" : previous.transform,
          opacity: 1,
          offset: 0,
          easing: "cubic-bezier(0.4, 0, 1, 1)",
        },
        { transform: "scaleX(1)", opacity: 1, offset: 0.55 },
        { transform: "scaleX(1)", opacity: 1, offset: 0.75 },
        { transform: "scaleX(1)", opacity: 0, offset: 1 },
      ],
      { duration: reducedMotion ? 150 : 500, pseudoElement: "::after" },
    );
    return () => animation.cancel();
  }, [loading, progressRef]);

  return header;
}
