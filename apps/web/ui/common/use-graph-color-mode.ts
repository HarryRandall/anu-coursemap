import { useTheme } from "next-themes";

/**
 * React Flow selects its dark palette from a `.dark` class, and Coursemap's is
 * `.dark-mode`, so every graph rendered light chrome regardless of the theme.
 * Its `colorMode` prop sets that class on the graph itself, so drive it from
 * the resolved theme. "system" is the honest answer before the theme is known.
 */
export function useGraphColorMode() {
  const { resolvedTheme } = useTheme();
  if (resolvedTheme === "dark") return "dark" as const;
  if (resolvedTheme === "light") return "light" as const;
  return "system" as const;
}
