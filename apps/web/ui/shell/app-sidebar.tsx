"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@coursemap/ui/primitives/sidebar";
import { useCoursemap } from "@/app/providers";
import { BrandMark } from "@/ui/brand-mark";
import { CourseFind } from "@/ui/course-find";
import { routeIcons } from "@/ui/shell/route-icons";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

type NavSection = {
  label: string | null;
  items: NavItem[];
};

const studentNav: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Home", icon: routeIcons.dashboard },
      { href: "/plan", label: "Plan", icon: routeIcons.plan },
      { href: "/courses", label: "Courses", icon: routeIcons.courses },
      {
        href: "/requirements",
        label: "Requirements",
        icon: routeIcons.requirements,
      },
      { href: "/academic", label: "Academic", icon: routeIcons.academic },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/calendar", label: "Calendar", icon: routeIcons.calendar },
      { href: "/key-dates", label: "Key dates", icon: routeIcons["key-dates"] },
      { href: "/roadmap", label: "Roadmap", icon: routeIcons.roadmap },
      {
        href: "/rooms",
        label: "Room finder",
        icon: routeIcons.rooms,
        badge: "Preview",
      },
      { href: "/help", label: "Help centre", icon: routeIcons.help },
    ],
  },
];

/**
 * Grouped around the operator's jobs: course data, campus data, durable
 * imports and access control.
 */
const adminNav: NavSection[] = [
  {
    label: null,
    items: [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: routeIcons["admin-dashboard"],
      },
    ],
  },
  {
    label: "Academic data",
    items: [
      { href: "/admin/courses", label: "Courses", icon: routeIcons.courses },
      {
        href: "/admin/programmes",
        label: "Programmes",
        icon: routeIcons.programmes,
      },
      { href: "/admin/majors", label: "Majors", icon: routeIcons.majors },
      { href: "/admin/minors", label: "Minors", icon: routeIcons.minors },
      {
        href: "/admin/specialisations",
        label: "Specialisations",
        icon: routeIcons.specialisations,
      },
    ],
  },
  {
    label: "Campus",
    items: [
      {
        href: "/admin/rooms",
        label: "Indoor maps",
        icon: routeIcons["admin-rooms"],
      },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/admin/users", label: "Users", icon: routeIcons.users },
      { href: "/admin/roles", label: "Roles", icon: routeIcons.roles },
    ],
  },
];

/** Shown to students who hold an admin role. */
const adminEntryNav: NavSection[] = [
  {
    label: "Administration",
    items: [
      {
        href: "/admin/dashboard",
        label: "Admin console",
        icon: routeIcons.admin,
      },
    ],
  },
];

/** Shown at the bottom of the admin shell. */
const studentEntryNav: NavSection[] = [
  {
    label: null,
    items: [
      {
        href: "/dashboard",
        label: "Back to student home",
        icon: routeIcons.dashboard,
      },
    ],
  },
];

function NavMenuItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === "/admin/dashboard"
      ? pathname === item.href || pathname === "/admin"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className="h-10 gap-3 px-3 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary data-[active=true]:hover:text-sidebar-primary-foreground"
      >
        <Link href={item.href} onClick={onNavigate}>
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {item.badge ? (
        <SidebarMenuBadge className="rounded-full bg-primary/10 px-1.5 text-[9px] font-bold text-primary uppercase">
          {item.badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

function NavSections({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate: () => void;
}) {
  return (
    <>
      {sections.map((section) => (
        <SidebarGroup
          key={section.label ?? "primary"}
          className="px-3 py-2 group-data-[collapsible=icon]:px-2"
        >
          {section.label ? (
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {section.items.map((item) => (
                <NavMenuItem
                  key={item.href}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function AppSidebar({ admin }: { admin: boolean }) {
  const { state, canAccessAdmin } = useCoursemap();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  const initials =
    (state.profile.name || state.profile.email)
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <Sidebar collapsible="icon" className="select-none">
      <SidebarHeader className="gap-3 px-3 pb-3 group-data-[collapsible=icon]:px-2">
        <Link
          href={admin ? "/admin/dashboard" : "/dashboard"}
          aria-label="Coursemap home"
          onClick={closeMobileNav}
          className="flex h-12 items-center gap-2.5 rounded-md px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <BrandMark className="size-8 shrink-0" />
          <strong className="brand-wordmark text-[17px] group-data-[collapsible=icon]:hidden">
            coursemap
          </strong>
        </Link>

        <CourseFind admin={admin} onNavigate={closeMobileNav} />
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label={admin ? "Admin navigation" : "Student navigation"}>
          <NavSections
            sections={admin ? adminNav : studentNav}
            onNavigate={closeMobileNav}
          />
        </nav>

        {/* Cross-links between the student and admin shells share the same item styling as the main navigation. */}
        {!admin && canAccessAdmin ? (
          <NavSections sections={adminEntryNav} onNavigate={closeMobileNav} />
        ) : null}
        {admin ? (
          <div className="mt-auto">
            <NavSections
              sections={studentEntryNav}
              onNavigate={closeMobileNav}
            />
          </div>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={state.profile.name || "Profile"}
            >
              <Link href="/profile" onClick={closeMobileNav}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {initials}
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[13px] font-semibold">
                    {state.profile.name || "Set up profile"}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {state.profile.studentId || "Add student ID"}
                  </span>
                </span>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
