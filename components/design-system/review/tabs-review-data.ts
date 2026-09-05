import type { ComponentReviewItem } from "./review-types";

export const untitledTabsReviewItems = [
  {
    id: "untitled:tabs:button-brand",
    family: "tabs",
    title: "Brand button tabs",
    description: "Filled brand tabs for high-emphasis switching.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:button-gray",
    family: "tabs",
    title: "Neutral button tabs",
    description: "Filled neutral tabs for compact product controls.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:button-border",
    family: "tabs",
    title: "Bordered button tabs",
    description: "Individual bordered tabs with a clear active state.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:button-minimal",
    family: "tabs",
    title: "Minimal button tabs",
    description: "Low-emphasis tabs for quiet secondary navigation.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:underline",
    family: "tabs",
    title: "Underline tabs",
    description: "A familiar underline treatment for page sections.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:small-badges",
    family: "tabs",
    title: "Small tabs with badges",
    description: "Compact tabs with count badges.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:medium-badges",
    family: "tabs",
    title: "Medium tabs with badges",
    description: "Roomier tabs with count badges.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:full-width",
    family: "tabs",
    title: "Full-width tabs",
    description: "Tabs that divide the available width evenly.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:vertical",
    family: "tabs",
    title: "Vertical tabs",
    description: "Vertical navigation for settings-style layouts.",
    source: "untitled",
  },
  {
    id: "untitled:tabs:panels",
    family: "tabs",
    title: "Tabs with content panels",
    description: "A complete controlled tab set with changing content.",
    source: "untitled",
  },
] as const satisfies readonly ComponentReviewItem[];

export type UntitledTabsReviewId =
  (typeof untitledTabsReviewItems)[number]["id"];

export function findUntitledTabsReviewItem(id: string) {
  return untitledTabsReviewItems.find((item) => item.id === id);
}
