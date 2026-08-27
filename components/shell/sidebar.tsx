"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect } from "react";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  GitCompareArrows,
  GraduationCap,
  House,
  Import,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Map,
  MapPin,
  RefreshCw,
  Route,
  Shield,
  Table2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { useAdminNav } from "@/components/admin/admin-nav-context";
import { BrandMark } from "@/components/brand-mark";
import { CourseFind } from "@/components/course-find";
import { IconButton } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  /** Renders a live numeric badge, resolved from the admin nav context. */
  count?: "openChanges";
  dividerAfter?: boolean;
};

const studentNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/courses", label: "Courses", icon: BookOpen },
  {
    href: "/requirements",
    label: "Requirements",
    icon: ListChecks,
    dividerAfter: true,
  },
  { href: "/academic", label: "Academic", icon: GraduationCap },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  {
    href: "/key-dates",
    label: "Key dates",
    icon: CalendarRange,
    dividerAfter: true,
  },
  { href: "/roadmap", label: "Roadmap", icon: Route },
  {
    href: "/rooms",
    label: "Room finder",
    icon: MapPin,
    badge: "Preview",
  },
];

type NavSection = {
  icon?: LucideIcon;
  items: NavItem[];
  label: string | null;
};

/**
 * Grouped rather than one flat list. The admin destinations do three unrelated
 * jobs -- editing the catalogue, pulling it in from ANU, and controlling who
 * gets in -- and running them together made the whole console read as
 * undifferentiated.
 *
 * Importing is deliberately three destinations rather than one page with tabs:
 * pulling courses, pulling programmes and reviewing what changed are separate
 * tasks that no operator does in one sitting.
 */
const adminNav: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/courses", label: "Courses", icon: Table2 },
      { href: "/admin/programmes", label: "Programmes", icon: GraduationCap },
    ],
  },
  {
    icon: Import,
    label: "Imports",
    items: [
      { href: "/admin/imports/sync", label: "Sync", icon: RefreshCw },
      {
        href: "/admin/imports/courses",
        label: "Import courses",
        icon: BookOpen,
      },
      {
        href: "/admin/imports/programmes",
        label: "Import programmes",
        icon: GraduationCap,
      },
      {
        count: "openChanges",
        href: "/admin/imports/changes",
        label: "Changes",
        icon: GitCompareArrows,
      },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersRound },
      { href: "/admin/roles", label: "Roles", icon: KeyRound },
    ],
  },
];

function Brand() {
  return (
    <Link
      href="/dashboard"
      aria-label="Coursemap home"
      className="flex items-center gap-2.5 px-1.5"
    >
      <BrandMark className="size-9" />
      <strong className="brand-wordmark text-[17px]">coursemap</strong>
    </Link>
  );
}

function NavLink({
  item,
  admin,
  onNavigate,
}: {
  item: NavItem;
  admin: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { openChangeCount } = useAdminNav();
  const isActive =
    item.href === "/admin/dashboard"
      ? pathname === item.href || pathname === "/admin"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const count = item.count === "openChanges" ? openChangeCount : 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative mx-3 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition",
        isActive
          ? admin
            ? "bg-brand-50 text-brand-700"
            : "bg-brand-700 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      <Icon size={17} strokeWidth={1.9} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 && (
        // Tabular so a two-digit count does not shift the pill's centre.
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-amber-800 tabular-nums">
          {count}
          <span className="sr-only"> awaiting review</span>
        </span>
      )}
      {item.badge && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
            isActive ? "bg-white/15 text-white" : "bg-brand-50 text-brand-600",
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  admin,
  mobile,
  onNavigate,
}: {
  admin: boolean;
  mobile: boolean;
  onNavigate: () => void;
}) {
  const { state, canAccessAdmin } = useCoursemap();
  const initials =
    (state.profile.name || state.profile.email)
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <>
      <div className="flex items-center justify-between px-3">
        <Brand />
        {mobile ? (
          <IconButton
            label="Close navigation"
            variant="ghost"
            onClick={onNavigate}
          >
            <X size={18} aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>

      {!admin && (
        <div className="px-3">
          <CourseFind onNavigate={onNavigate} />
        </div>
      )}

      <nav
        aria-label={admin ? "Admin navigation" : "Student navigation"}
        className="mt-5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        {admin ? (
          <div className="flex flex-col gap-1">
            {adminNav.map((section) => (
              <Fragment key={section.label ?? "primary"}>
                {section.label ? (
                  <h2 className="mt-4 mb-1 flex items-center gap-1.5 px-6 text-[11px] leading-none font-medium tracking-wide text-zinc-400 uppercase first:mt-0">
                    {section.icon ? (
                      <section.icon
                        aria-hidden="true"
                        className="size-3 shrink-0"
                        strokeWidth={2}
                      />
                    ) : null}
                    {section.label}
                  </h2>
                ) : null}
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    admin
                    onNavigate={onNavigate}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {studentNav.map((item) => (
              <Fragment key={item.href}>
                <NavLink item={item} admin={false} onNavigate={onNavigate} />
                {item.dividerAfter && (
                  <div
                    aria-hidden="true"
                    className="my-1.5 border-t border-zinc-200/80"
                  />
                )}
              </Fragment>
            ))}
          </div>
        )}

        {!admin && canAccessAdmin && (
          <>
            <div
              aria-hidden="true"
              className="my-1.5 border-t border-zinc-200/80"
            />
            <Link
              href="/admin/dashboard"
              onClick={onNavigate}
              className="mx-3 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Shield size={17} strokeWidth={1.9} />
              <span>Admin console</span>
            </Link>
          </>
        )}
      </nav>

      {admin && (
        <>
          <div className="mb-1.5 border-t border-zinc-200/80" />
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="mx-3 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Map size={17} strokeWidth={1.9} />
            <span>Back to student home</span>
          </Link>
        </>
      )}

      {!admin && (
        <Link
          href="/help"
          onClick={onNavigate}
          className="mx-3 mt-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <LifeBuoy size={17} strokeWidth={1.9} />
          <span>Help &amp; support</span>
        </Link>
      )}

      <Link
        href="/profile"
        onClick={onNavigate}
        className="mx-3 mt-1 flex items-center gap-3 rounded-xl p-2 transition hover:bg-zinc-100"
      >
        <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-zinc-900">
            {state.profile.name || "Set up profile"}
          </span>
          <span className="block truncate text-[11px] text-zinc-500">
            {state.profile.studentId || "Add student ID"}
          </span>
        </span>
        <UserRound size={15} className="text-zinc-400" />
      </Link>
    </>
  );
}

export function Sidebar({
  admin,
  mobileOpen,
  onClose,
}: {
  admin: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!mobileOpen) return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };

    if (desktop.matches) {
      onClose();
      return;
    }

    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, [mobileOpen, onClose]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-zinc-200 bg-zinc-50/80 pt-5 pb-3 backdrop-blur lg:flex">
        <SidebarContent admin={admin} mobile={false} onNavigate={onClose} />
      </aside>

      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          overlayClassName="lg:hidden"
          className="w-64 max-w-none bg-zinc-50/95 pt-5 pb-3 backdrop-blur lg:hidden"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = document.getElementById(
              "mobile-navigation-trigger",
            );
            if (trigger?.getClientRects().length) trigger.focus();
          }}
        >
          <SheetTitle className="sr-only">Coursemap navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Navigate Coursemap pages and account settings.
          </SheetDescription>
          <SidebarContent admin={admin} mobile onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
