"use client";

import { createContext, useContext, type ReactNode } from "react";

const SidebarPreferenceContext = createContext(true);

/**
 * Carries the server-read sidebar state to every `AppShell` so a collapsed
 * rail stays collapsed across navigations and reloads without a hydration
 * flash.
 */
export function SidebarPreferenceProvider({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarPreferenceContext.Provider value={defaultOpen}>
      {children}
    </SidebarPreferenceContext.Provider>
  );
}

export function useSidebarDefaultOpen() {
  return useContext(SidebarPreferenceContext);
}
