"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChevronsUpDown,
  GraduationCap,
  House,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Map,
  MapPin,
  MapPinned,
  Route,
  Shield,
  Tag,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
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
} from "@reui/ui/sidebar";
import { useCoursemap } from "@/app/providers";
import { BrandMark } from "@/components/brand-mark";
import { CourseFind } from "@/components/course-find";

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
      { href: "/dashboard", label: "Home", icon: House },
      { href: "/plan", label: "Plan", icon: Map },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/requirements", label: "Requirements", icon: ListChecks },
      { href: "/academic", label: "Academic", icon: GraduationCap },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/key-dates", label: "Key dates", icon: CalendarRange },
      { href: "/roadmap", label: "Roadmap", icon: Route },
      { href: "/rooms", label: "Room finder", icon: MapPin, badge: "Preview" },
      { href: "/help", label: "Help centre", icon: LifeBuoy },
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
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Academic data",
    items: [
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/programmes", label: "Programmes", icon: GraduationCap },
      { href: "/admin/majors", label: "Majors", icon: Award },
      { href: "/admin/minors", label: "Minors", icon: Tag },
      {
        href: "/admin/specialisations",
        label: "Specialisations",
        icon: Target,
      },
    ],
  },
  {
    label: "Campus",
    items: [{ href: "/admin/rooms", label: "Indoor maps", icon: MapPinned }],
  },
  {
    label: "Access",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersRound },
      { href: "/admin/roles", label: "Roles", icon: KeyRound },
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
        className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary data-[active=true]:hover:text-sidebar-primary-foreground"
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
        <SidebarGroup key={section.label ?? "primary"}>
          {section.label ? (
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
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
    <Sidebar collapsible="icon">
      <SidebarHeader>
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

        {!admin && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="My degree plan">
                <Link href="/profile" onClick={closeMobileNav}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap aria-hidden="true" className="size-4" />
                  </span>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-[13px] font-semibold">
                      My degree plan
                    </span>
                    <span className="text-muted-foreground truncate text-[11px]">
                      {state.profile.commencementYear} commencement
                    </span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        {!admin && (
          <div className="group-data-[collapsible=icon]:hidden">
            <CourseFind onNavigate={closeMobileNav} />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavSections
          sections={admin ? adminNav : studentNav}
          onNavigate={closeMobileNav}
        />

        {!admin && canAccessAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Admin console"
                  >
                    <Link href="/admin/dashboard" onClick={closeMobileNav}>
                      <Shield aria-hidden="true" />
                      <span>Admin console</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {admin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Back to student home">
                    <Link href="/dashboard" onClick={closeMobileNav}>
                      <Map aria-hidden="true" />
                      <span>Back to student home</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold">
                  {initials}
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[13px] font-semibold">
                    {state.profile.name || "Set up profile"}
                  </span>
                  <span className="text-muted-foreground truncate text-[11px]">
                    {state.profile.studentId || "Add student ID"}
                  </span>
                </span>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="text-muted-foreground size-3.5"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
