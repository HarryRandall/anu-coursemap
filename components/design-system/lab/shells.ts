/**
 * Server-safe shell registry. Kept out of shell-previews.tsx because that file
 * is a client module, and a "use client" boundary turns its exports into client
 * references that a server component cannot iterate.
 */
export const shellIds = [
  "sidebar-simple",
  "sidebar-slim",
  "sidebar-dual-tier",
  "sidebar-section-dividers",
  "sidebar-sections-subheadings",
  "header-navigation",
] as const;

export type ShellId = (typeof shellIds)[number];

export const shellLabels: Record<ShellId, { title: string; summary: string }> =
  {
    "sidebar-simple": {
      title: "Simple sidebar",
      summary:
        "The default application shell. A search field, nav list and account card.",
    },
    "sidebar-slim": {
      title: "Slim sidebar",
      summary:
        "Icon only, for surfaces that need the horizontal space. Hover an item for its tooltip.",
    },
    "sidebar-dual-tier": {
      title: "Dual tier",
      summary: "A slim rail plus a contextual second tier, for admin areas.",
    },
    "sidebar-section-dividers": {
      title: "Section dividers",
      summary: "Grouped navigation separated by rules.",
    },
    "sidebar-sections-subheadings": {
      title: "Sections with subheadings",
      summary: "Labelled groups, for long administrative navigation.",
    },
    "header-navigation": {
      title: "Header navigation",
      summary:
        "The horizontal alternative, for signed-out and marketing surfaces.",
    },
  };
