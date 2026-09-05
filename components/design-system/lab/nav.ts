import { reuiCatalogueNavigationCategories } from "@reui/catalogue-data/catalogue-navigation.generated";
import { componentReviewFamilies } from "@/components/design-system/review/review-families";

/** Provenance of a laboratory section's components. */
export type LabSource =
  | "mit" // vendored verbatim from the MIT source, imports rewritten only
  | "reui" // vendored from ReUI's MIT registry with isolated imports and tokens
  | "adapted" // built here because no free source exists
  | "tokens" // the theme itself rather than a component
  | "review"; // local review workflow over several component sources

export type LabSection = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly source: LabSource;
  readonly group: LabGroup;
  /** Upstream documentation page, where one exists. */
  readonly docs?: string;
  /** Custom route for catalogue-style sections outside the standard slug page. */
  readonly href?: string;
};

export type LabGroup =
  | "Review"
  | "Foundations"
  | "Base components"
  | "Application components"
  | "Coursemap"
  | "ReUI components";

export const labSections: readonly LabSection[] = [
  {
    slug: "redesign",
    title: "Navigation + dashboard",
    summary:
      "Compare two complete directions using the saved design foundation.",
    source: "tokens",
    group: "Coursemap",
    href: "/design-system/redesign",
  },
  {
    slug: "shortlist",
    title: "Component shortlist",
    summary: "Ten focused rounds, with your earlier choices preserved.",
    source: "tokens",
    group: "Foundations",
    href: "/design-system/shortlist",
  },
  {
    slug: "compare",
    title: "Pick your style",
    summary: "Compare fonts, colours, corners and spacing visually.",
    source: "tokens",
    group: "Foundations",
    href: "/design-system/compare",
  },
  {
    slug: "component-review",
    title: "Review summary",
    summary: "Saved decisions across the component catalogue.",
    source: "review",
    group: "Review",
    href: "/design-system/review",
  },
  {
    slug: "foundations",
    title: "Foundations",
    summary: "Brand ramp, neutral ramp and every semantic colour role.",
    source: "tokens",
    group: "Foundations",
    docs: "https://www.untitledui.com/react/components",
  },
  {
    slug: "typography",
    title: "Typography",
    summary: "The text and display scales, weights and prose defaults.",
    source: "tokens",
    group: "Foundations",
  },
  {
    slug: "spacing",
    title: "Spacing and elevation",
    summary: "The 4px spacing rhythm, radius scale and shadow ramp.",
    source: "tokens",
    group: "Foundations",
  },
  {
    slug: "buttons",
    title: "Buttons",
    summary: "Five sizes across eight colours, with icons and loading.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/buttons",
  },
  {
    slug: "button-groups",
    title: "Button groups and utilities",
    summary: "Segmented groups, utility buttons and link buttons.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/button-groups",
  },
  {
    slug: "badges",
    title: "Badges and tags",
    summary: "Badge colours, types, badge groups and dismissible tags.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/badges",
  },
  {
    slug: "avatars",
    title: "Avatars",
    summary: "Sizes, fallbacks, status, groups and label groups.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/avatars",
  },
  {
    slug: "inputs",
    title: "Inputs",
    summary: "Sizes, icons, affixes, hints and every validation state.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/inputs",
  },
  {
    slug: "textareas",
    title: "Textareas",
    summary: "Multi-line entry with hints, counters and invalid states.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/textarea",
  },
  {
    slug: "selects",
    title: "Selects",
    summary: "Plain, rich two-line, icon and native selects.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/select",
  },
  {
    slug: "combobox",
    title: "Combobox and search",
    summary: "Type-ahead filtering over the course catalogue.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/select",
  },
  {
    slug: "multi-select",
    title: "Multi-select and tag select",
    summary: "Multiple selection rendered as removable tags.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/select",
  },
  {
    slug: "choices",
    title: "Checkboxes, radios and toggles",
    summary: "Selection controls in every size and state.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/checkboxes",
  },
  {
    slug: "slider",
    title: "Sliders",
    summary: "Single and range sliders with live labels.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/slider",
  },
  {
    slug: "tooltips",
    title: "Tooltips",
    summary: "Four placements, with and without supporting text.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/tooltip",
  },
  {
    slug: "dropdowns",
    title: "Dropdown menus",
    summary: "Menus, sections, shortcuts, checkboxes and submenus.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/dropdowns",
  },
  {
    slug: "progress",
    title: "Progress indicators",
    summary: "Bars, circles and half circles with label placements.",
    source: "mit",
    group: "Base components",
    docs: "https://www.untitledui.com/react/components/progress-indicators",
  },
  {
    slug: "tabs",
    title: "Tabs",
    summary: "Six tab styles with badges and real panel switching.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/tabs",
  },
  {
    slug: "breadcrumbs",
    title: "Breadcrumbs",
    summary: "Trail navigation with an overflow menu.",
    source: "adapted",
    group: "Application components",
  },
  {
    slug: "pagination",
    title: "Pagination",
    summary: "Page numbers, buttons, dots and progress bars.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/pagination",
  },
  {
    slug: "date-pickers",
    title: "Date and range pickers",
    summary: "Single date, date range and presets over a real calendar.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/date-picker",
  },
  {
    slug: "file-upload",
    title: "File upload",
    summary: "Dropzone, progress, failure and retry.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/file-upload",
  },
  {
    slug: "alerts",
    title: "Alerts",
    summary: "Inline and floating alerts in four intents.",
    source: "adapted",
    group: "Application components",
  },
  {
    slug: "notifications",
    title: "Notifications and toasts",
    summary: "Dismissible, actionable toasts over Sonner.",
    source: "adapted",
    group: "Application components",
  },
  {
    slug: "modals",
    title: "Modals",
    summary: "Confirmation, form and destructive dialogs.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/modals",
  },
  {
    slug: "drawers",
    title: "Drawers",
    summary: "Slideout panels from either edge.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/slideout-menus",
  },
  {
    slug: "empty-states",
    title: "Empty states",
    summary: "No results, no data and permission states.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/empty-state",
  },
  {
    slug: "loading",
    title: "Loading and skeletons",
    summary: "Spinners, dots and component-shaped skeletons.",
    source: "adapted",
    group: "Application components",
  },
  {
    slug: "tables",
    title: "Tables",
    summary: "Sorting, filtering, selection and bulk actions.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/table",
  },
  {
    slug: "metrics",
    title: "Metrics and charts",
    summary: "Metric cards over the Untitled chart primitives.",
    source: "adapted",
    group: "Application components",
  },
  {
    slug: "navigation",
    title: "Navigation shells",
    summary: "Five sidebars and the header navigation.",
    source: "mit",
    group: "Application components",
    docs: "https://www.untitledui.com/react/components/application-navigation",
  },
  {
    slug: "coursemap-cards",
    title: "Coursemap cards",
    summary: "Course, programme and requirement cards from the primitives.",
    source: "adapted",
    group: "Coursemap",
  },
  {
    slug: "dashboard",
    title: "Dashboard concept",
    summary: "A modern academic overview with prototype student data.",
    source: "adapted",
    group: "Coursemap",
  },
  {
    slug: "reui-catalogue",
    title: "Free component catalogue",
    summary: "All 1,105 free ReUI Radix examples across 74 families.",
    source: "reui",
    group: "ReUI components",
    href: "/design-system/reui",
    docs: "https://reui.io/components",
  },
  {
    slug: "reui-alert",
    title: "Alert",
    summary: "Contextual notices with severity and action variants.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/alert",
  },
  {
    slug: "reui-autocomplete",
    title: "Autocomplete",
    summary: "Searchable suggestions with keyboard navigation.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/autocomplete",
  },
  {
    slug: "reui-badge",
    title: "Badge",
    summary: "Compact labels with semantic visual variants.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/badge",
  },
  {
    slug: "reui-cascader",
    title: "Cascader",
    summary: "Nested selection with search, columns and tree modes.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/cascader",
  },
  {
    slug: "reui-code-block",
    title: "Code block",
    summary: "Syntax-highlighted code with headers and copy actions.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/code-block",
  },
  {
    slug: "reui-data-grid",
    title: "Data grid",
    summary: "A composable TanStack grid with sorting and pagination.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/data-grid",
  },
  {
    slug: "reui-date-selector",
    title: "Date selector",
    summary: "Natural date entry with calendar and range support.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/date-selector",
  },
  {
    slug: "reui-event-calendar",
    title: "Event calendar",
    summary: "Multi-view scheduling with drag-and-drop interactions.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/event-calendar",
  },
  {
    slug: "reui-filters",
    title: "Filters",
    summary: "A structured filter builder with rich value editors.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/filters",
  },
  {
    slug: "reui-frame",
    title: "Frame",
    summary: "Structured panels with headers, content and footers.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/frame",
  },
  {
    slug: "reui-gantt",
    title: "Gantt",
    summary: "An interactive project timeline with scalable scheduling.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/gantt",
  },
  {
    slug: "reui-icon-stack",
    title: "Icon stack",
    summary: "Layered icon treatments for features and empty states.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/icon-stack",
  },
  {
    slug: "reui-icon-tile",
    title: "Icon tile",
    summary: "Contained icon surfaces in several visual styles.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/icon-tile",
  },
  {
    slug: "reui-kanban",
    title: "Kanban",
    summary: "Drag-and-drop boards with composable columns and cards.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/kanban",
  },
  {
    slug: "reui-number-field",
    title: "Number field",
    summary: "Numeric input with scrubbing and step controls.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/number-field",
  },
  {
    slug: "reui-phone-input",
    title: "Phone input",
    summary: "International phone entry with country selection.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/phone-input",
  },
  {
    slug: "reui-rating",
    title: "Rating",
    summary: "Read-only and interactive star rating treatments.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/rating",
  },
  {
    slug: "reui-scrollspy",
    title: "Scrollspy",
    summary: "Navigation that tracks the active scroll region.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/scrollspy",
  },
  {
    slug: "reui-sortable",
    title: "Sortable",
    summary: "Keyboard-accessible drag-and-drop list reordering.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/sortable",
  },
  {
    slug: "reui-stepper",
    title: "Stepper",
    summary: "Multi-step flows with progress and panel composition.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/stepper",
  },
  {
    slug: "reui-timeline",
    title: "Timeline",
    summary: "Sequential milestones, activity and status history.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/timeline",
  },
  {
    slug: "reui-tree",
    title: "Tree",
    summary: "Keyboard-navigable hierarchical data with expansion.",
    source: "reui",
    group: "ReUI components",
    docs: "https://reui.io/docs/components/radix/tree",
  },
] as const;

export const labGroups: readonly LabGroup[] = [
  "Review",
  "Foundations",
  "Base components",
  "Application components",
  "Coursemap",
  "ReUI components",
];

export function findSection(slug: string): LabSection | undefined {
  return labSections.find((section) => section.slug === slug);
}

export function labSectionHref(section: LabSection) {
  return section.href ?? `/design-system/${section.slug}`;
}

export const reuiCatalogueNavSections: readonly LabSection[] = [
  ...reuiCatalogueNavigationCategories.map((category) => ({
    slug: `reui-catalogue-${category.name}`,
    title: category.label,
    summary: `${category.count} free ReUI examples.`,
    source: "reui" as const,
    group: "ReUI components" as const,
    href: `/design-system/reui/${category.name}`,
  })),
];

export const reviewCatalogueNavSections: readonly LabSection[] = [
  ...labSections.filter((section) => section.group === "Review"),
  ...componentReviewFamilies.map((family) => ({
    slug: `review-${family.slug}`,
    title: family.title,
    summary: family.summary,
    source: "review" as const,
    group: "Review" as const,
    href: `/design-system/review/${family.slug}`,
  })),
];

export const sourceLabels: Record<LabSource, string> = {
  mit: "MIT source",
  reui: "ReUI, MIT source",
  adapted: "Adapted, no MIT source",
  tokens: "Theme tokens",
  review: "Review workspace",
};
