import { reuiCatalogueNavigationCategories } from "@reui/catalogue-data/catalogue-navigation.generated";

export type ComponentReviewFamily = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly reuiCategories: readonly string[];
  readonly labSections: readonly string[];
};

type FamilyGroup = ComponentReviewFamily;

const groupedFamilies: readonly FamilyGroup[] = [
  {
    slug: "alerts",
    title: "Alerts",
    summary: "Compare alert treatments from every available source.",
    reuiCategories: ["alert"],
    labSections: ["alerts"],
  },
  {
    slug: "avatars",
    title: "Avatars",
    summary: "Compare avatar sizes, states, groups and labels.",
    reuiCategories: ["avatar"],
    labSections: ["avatars"],
  },
  {
    slug: "badges",
    title: "Badges and tags",
    summary: "Compare badges, tags and compact status labels.",
    reuiCategories: ["badge"],
    labSections: ["badges"],
  },
  {
    slug: "breadcrumbs",
    title: "Breadcrumbs",
    summary: "Compare hierarchy and overflow navigation patterns.",
    reuiCategories: ["breadcrumb"],
    labSections: ["breadcrumbs"],
  },
  {
    slug: "buttons",
    title: "Buttons",
    summary: "Compare button sizes, intents, icons and loading states.",
    reuiCategories: ["button"],
    labSections: ["buttons"],
  },
  {
    slug: "button-groups",
    title: "Button groups",
    summary: "Compare grouped actions, segments and utility buttons.",
    reuiCategories: ["button-group"],
    labSections: ["button-groups"],
  },
  {
    slug: "cards",
    title: "Cards",
    summary: "Compare general card anatomy with Coursemap-specific cards.",
    reuiCategories: ["card"],
    labSections: ["coursemap-cards"],
  },
  {
    slug: "charts-and-metrics",
    title: "Charts and metrics",
    summary: "Compare charts, metrics and KPI presentation patterns.",
    reuiCategories: ["chart"],
    labSections: ["metrics"],
  },
  {
    slug: "comboboxes",
    title: "Comboboxes and multi-selects",
    summary: "Compare searchable, single and multiple selection patterns.",
    reuiCategories: ["combobox"],
    labSections: ["combobox", "multi-select"],
  },
  {
    slug: "date-pickers",
    title: "Calendars and date pickers",
    summary: "Compare calendars, natural date entry and range selection.",
    reuiCategories: ["calendar", "date-selector"],
    labSections: ["date-pickers"],
  },
  {
    slug: "dialogs",
    title: "Dialogs and modals",
    summary: "Compare standard, confirmation and destructive dialogs.",
    reuiCategories: ["alert-dialog", "dialog"],
    labSections: ["modals"],
  },
  {
    slug: "drawers",
    title: "Drawers and sheets",
    summary: "Compare slideout panels, drawers and sheets.",
    reuiCategories: ["drawer", "sheet"],
    labSections: ["drawers"],
  },
  {
    slug: "dropdown-menus",
    title: "Dropdown menus",
    summary: "Compare menus, sections, shortcuts and nested actions.",
    reuiCategories: ["dropdown-menu"],
    labSections: ["dropdowns"],
  },
  {
    slug: "empty-states",
    title: "Empty states",
    summary: "Compare no-data, no-result and permission states.",
    reuiCategories: ["empty"],
    labSections: ["empty-states"],
  },
  {
    slug: "file-upload",
    title: "File upload",
    summary: "Compare upload, progress, failure and retry patterns.",
    reuiCategories: ["file-upload"],
    labSections: ["file-upload"],
  },
  {
    slug: "inputs",
    title: "Inputs and fields",
    summary: "Compare labels, fields, inputs, groups, affixes and states.",
    reuiCategories: ["field", "input", "input-group", "label"],
    labSections: ["inputs"],
  },
  {
    slug: "loading",
    title: "Loading and skeletons",
    summary: "Compare spinners, skeletons and component loading states.",
    reuiCategories: ["skeleton", "spinner"],
    labSections: ["loading"],
  },
  {
    slug: "navigation",
    title: "Navigation",
    summary: "Compare navigation menus and full application shells.",
    reuiCategories: ["navigation-menu"],
    labSections: ["navigation"],
  },
  {
    slug: "notifications",
    title: "Notifications and toasts",
    summary: "Compare transient notifications, actions and toast states.",
    reuiCategories: ["sonner"],
    labSections: ["notifications"],
  },
  {
    slug: "pagination",
    title: "Pagination",
    summary: "Compare page, button, dot and progress navigation.",
    reuiCategories: ["pagination"],
    labSections: ["pagination"],
  },
  {
    slug: "progress",
    title: "Progress",
    summary: "Compare bars, circles and progress label placements.",
    reuiCategories: ["progress"],
    labSections: ["progress"],
  },
  {
    slug: "selection-controls",
    title: "Selection controls",
    summary: "Compare checkboxes, radios, switches and choice states.",
    reuiCategories: ["checkbox", "radio-group", "switch"],
    labSections: ["choices"],
  },
  {
    slug: "selects",
    title: "Selects",
    summary: "Compare native, styled, rich and validated selects.",
    reuiCategories: ["native-select", "select"],
    labSections: ["selects"],
  },
  {
    slug: "sliders",
    title: "Sliders",
    summary: "Compare single and range sliders with live labels.",
    reuiCategories: ["slider"],
    labSections: ["slider"],
  },
  {
    slug: "tables",
    title: "Tables",
    summary: "Compare table sorting, filtering, selection and actions.",
    reuiCategories: ["table"],
    labSections: ["tables"],
  },
  {
    slug: "tabs",
    title: "Tabs",
    summary: "Compare every tab style and panel interaction.",
    reuiCategories: ["tabs"],
    labSections: ["tabs"],
  },
  {
    slug: "textareas",
    title: "Textareas",
    summary: "Compare multi-line inputs, counters and validation states.",
    reuiCategories: ["textarea"],
    labSections: ["textareas"],
  },
  {
    slug: "tooltips",
    title: "Tooltips",
    summary: "Compare placements, supporting text and trigger patterns.",
    reuiCategories: ["tooltip"],
    labSections: ["tooltips"],
  },
] as const;

const labOnlyFamilies: readonly FamilyGroup[] = [
  {
    slug: "dashboard",
    title: "Dashboard",
    summary: "Review the complete Coursemap dashboard concept.",
    reuiCategories: [],
    labSections: ["dashboard"],
  },
  {
    slug: "foundations",
    title: "Foundations",
    summary: "Review colour foundations and semantic design tokens.",
    reuiCategories: [],
    labSections: ["foundations"],
  },
  {
    slug: "spacing",
    title: "Spacing and elevation",
    summary: "Review spacing, radius and elevation foundations.",
    reuiCategories: [],
    labSections: ["spacing"],
  },
  {
    slug: "typography",
    title: "Typography",
    summary: "Review type scales, weights and prose treatments.",
    reuiCategories: [],
    labSections: ["typography"],
  },
] as const;

const groupedCategoryNames = new Set(
  groupedFamilies.flatMap((family) => family.reuiCategories),
);

const reuiOnlyFamilies: readonly ComponentReviewFamily[] =
  reuiCatalogueNavigationCategories
    .filter((category) => !groupedCategoryNames.has(category.name))
    .map((category) => ({
      slug: category.name,
      title: category.label,
      summary: `Review all ${category.count} ${category.label} examples from ReUI.`,
      reuiCategories: [category.name],
      labSections: [],
    }));

export const componentReviewFamilies: readonly ComponentReviewFamily[] = [
  ...groupedFamilies,
  ...reuiOnlyFamilies,
  ...labOnlyFamilies,
].sort((left, right) => left.title.localeCompare(right.title));

export function findComponentReviewFamily(slug: string) {
  return componentReviewFamilies.find((family) => family.slug === slug);
}

export function findComponentReviewFamilyByLabSection(sectionSlug: string) {
  return componentReviewFamilies.find((family) =>
    family.labSections.includes(sectionSlug),
  );
}
