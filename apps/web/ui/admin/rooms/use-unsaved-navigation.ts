"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps the editor's clean page chrome without letting a breadcrumb click or
 * browser close silently discard an unsaved floor plan.
 */
export function useUnsavedNavigation(dirty: boolean) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (dirty) return;
    allowNavigationRef.current = false;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function captureLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.download ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(destination.protocol)) return;

      const current = new URL(window.location.href);
      if (
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.search === current.search
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingUrl(destination.href);
    }

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", captureLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", captureLink, true);
    };
  }, [dirty]);

  const cancelNavigation = useCallback(() => setPendingUrl(null), []);
  const confirmNavigation = useCallback(() => {
    if (!pendingUrl) return;
    allowNavigationRef.current = true;
    window.location.assign(pendingUrl);
  }, [pendingUrl]);

  return {
    cancelNavigation,
    confirmNavigation,
    navigationPending: dirty && pendingUrl !== null,
  };
}
