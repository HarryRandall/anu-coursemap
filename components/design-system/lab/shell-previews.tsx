"use client";

import { useEffect } from "react";
import {
  BarChart03,
  BookOpen01,
  Calendar,
  GraduationHat01,
  LayoutAlt01,
  LifeBuoy01,
  MarkerPin01,
  Settings01,
} from "@untitledui/icons";
import { HeaderNavigationBase } from "@uui/components/application/app-navigation/header-navigation";
import { SidebarNavigationDualTier } from "@uui/components/application/app-navigation/sidebar-navigation/sidebar-dual-tier";
import { SidebarNavigationSectionDividers } from "@uui/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import { SidebarNavigationSectionsSubheadings } from "@uui/components/application/app-navigation/sidebar-navigation/sidebar-sections-subheadings";
import { SidebarNavigationSimple } from "@uui/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { SidebarNavigationSlim } from "@uui/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Badge } from "@uui/components/base/badges/badges";
import type { NavItemType } from "@uui/components/application/app-navigation/config";
import type { ShellId } from "./shells";

/**
 * Untitled UI's sidebar shells position themselves with `lg:fixed`, so they can
 * only be shown honestly at full page size. The laboratory renders these
 * routes inside an iframe rather than shrinking the component to fit a card.
 */

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutAlt01 },
  { label: "Plan", href: "/plan", icon: GraduationHat01 },
  { label: "Courses", href: "/courses", icon: BookOpen01 },
  {
    label: "Requirements",
    href: "/requirements",
    icon: BarChart03,
    badge: (
      <Badge size="sm" type="pill-color" color="warning">
        2
      </Badge>
    ),
  },
  { label: "Timetable", href: "/timetable", icon: Calendar },
  { label: "Rooms", href: "/rooms", icon: MarkerPin01 },
] satisfies Array<
  NavItemType & { href: string; icon: NonNullable<NavItemType["icon"]> }
>;

const footerItems = [
  { label: "Support", href: "/help", icon: LifeBuoy01 },
  { label: "Settings", href: "/profile", icon: Settings01 },
] satisfies Array<
  NavItemType & { href: string; icon: NonNullable<NavItemType["icon"]> }
>;

const sectionedItems: NavItemType[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutAlt01 },
  { label: "Plan", href: "/plan", icon: GraduationHat01 },
  { label: "divider-1", divider: true },
  { label: "Courses", href: "/courses", icon: BookOpen01 },
  { label: "Requirements", href: "/requirements", icon: BarChart03 },
  { label: "divider-2", divider: true },
  { label: "Timetable", href: "/timetable", icon: Calendar },
  { label: "Rooms", href: "/rooms", icon: MarkerPin01 },
];

const subheadingItems = [
  {
    label: "Study",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutAlt01 },
      { label: "Plan", href: "/plan", icon: GraduationHat01 },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Courses", href: "/courses", icon: BookOpen01 },
      { label: "Requirements", href: "/requirements", icon: BarChart03 },
    ],
  },
  {
    label: "Campus",
    items: [
      { label: "Timetable", href: "/timetable", icon: Calendar },
      { label: "Rooms", href: "/rooms", icon: MarkerPin01 },
    ],
  },
];

function PageBody() {
  return (
    <div className="bg-secondary_alt flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-display-xs font-semibold text-primary">Courses</h1>
        <p className="text-md text-tertiary">
          1,284 courses in the 2026 catalogue.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "COMP1100 Programming as Problem Solving",
          "COMP1110 Structured Programming",
          "MATH1013 Mathematics and Applications 1",
          "COMP2100 Software Design Methodologies",
          "COMP2610 Information Theory",
          "STAT2001 Introductory Mathematical Statistics",
        ].map((course) => (
          <div
            key={course}
            className="rounded-xl bg-primary p-5 ring-1 ring-secondary"
          >
            <p className="text-sm font-semibold text-primary">{course}</p>
            <p className="text-tertiary pt-1 text-sm">6 units</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Applies the theme passed down from the laboratory through the query string. */
function usePreviewTheme(theme: string | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark-mode", theme === "dark");
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
  }, [theme]);
}

export function ShellPreview({
  shell,
  theme,
}: {
  shell: ShellId;
  theme?: string;
}) {
  usePreviewTheme(theme);

  if (shell === "header-navigation") {
    return (
      <div className="uui-lab flex min-h-dvh flex-col">
        <HeaderNavigationBase activeUrl="/courses" items={items} />
        <PageBody />
      </div>
    );
  }

  const sidebar = {
    "sidebar-simple": (
      <SidebarNavigationSimple
        activeUrl="/courses"
        items={items}
        footerItems={footerItems}
      />
    ),
    "sidebar-slim": (
      <SidebarNavigationSlim
        activeUrl="/courses"
        items={items}
        footerItems={footerItems}
      />
    ),
    "sidebar-dual-tier": (
      <SidebarNavigationDualTier
        activeUrl="/courses"
        items={items}
        footerItems={footerItems}
      />
    ),
    "sidebar-section-dividers": (
      <SidebarNavigationSectionDividers
        activeUrl="/courses"
        items={sectionedItems}
      />
    ),
    "sidebar-sections-subheadings": (
      <SidebarNavigationSectionsSubheadings
        activeUrl="/courses"
        items={subheadingItems}
      />
    ),
  }[shell];

  return (
    <div className="uui-lab flex min-h-dvh flex-col lg:flex-row">
      {sidebar}
      <PageBody />
    </div>
  );
}
