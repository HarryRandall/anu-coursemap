"use client";
import { useRef } from "react";

/** Keep focus return for overlays opened without a Radix trigger. */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus() {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    },
    onCloseAutoFocus(event: Event) {
      if (opener.current?.isConnected) {
        event.preventDefault();
        opener.current.focus();
      }
    },
  };
}
