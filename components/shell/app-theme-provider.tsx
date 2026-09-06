"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@reui/ui/tooltip";

/** Theme initialisation runs through Next Script in the root layout. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      value={{ light: "light", dark: "dark-mode" }}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="coursemap.theme"
      // Keep the library's inline bootstrap inert during client rendering.
      // Its effects still manage theme changes and system preference updates.
      scriptProps={{ type: "text/plain" }}
    >
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
