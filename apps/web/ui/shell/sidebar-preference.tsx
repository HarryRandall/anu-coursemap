"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const SidebarPreferenceContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

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
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SidebarPreferenceContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarPreferenceContext.Provider>
  );
}

export function useSidebarDefaultOpen() {
  const preference = useContext(SidebarPreferenceContext);
  if (!preference) throw new Error("Sidebar preference provider is missing");
  return preference;
}
