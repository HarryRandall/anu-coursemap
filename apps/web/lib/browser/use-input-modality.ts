"use client";

import { useEffect } from "react";

/** Keep restored menu focus from inheriting a keyboard ring after a pointer action. */
export function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    function pointer() {
      root.dataset.inputModality = "pointer";
    }
    function keyboard(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      root.dataset.inputModality = "keyboard";
    }
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      delete root.dataset.inputModality;
    };
  }, []);
}
