"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  GitBranch,
  GraduationCap,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Map,
  RefreshCw,
  Search as SearchIcon,
  Table2,
  UserRound,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";

type NavItem = { href: string; label: string; icon: LucideIcon };

const studentNav: NavItem[] = [
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/requirements", label: "Requirements", icon: ListChecks },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/history", label: "History", icon: History },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: Table2 },
  { href: "/admin/programmes", label: "Programmes", icon: GraduationCap },
  { href: "/admin/relations", label: "Relations", icon: GitBranch },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/sync", label: "Sync", icon: RefreshCw },
];

function Brand() {
  return (
    <Link
      href="/plan"
      aria-label="Coursemap home"
      className="flex items-center gap-2.5 px-1.5"
    >
      <span
        className="grid size-6 -rotate-3 grid-cols-2 gap-0.5"
        aria-hidden="true"
      >
        <i className="rounded-[3px] bg-zinc-900" />
        <i className="rounded-[3px] bg-zinc-400" />
        <i className="rounded-[3px] bg-zinc-400" />
        <i className="rounded-[3px] bg-zinc-900" />
      </span>
      <strong className="text-[17px] font-bold tracking-tight">
        coursemap
      </strong>
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
  const isActive =
    item.href === "/admin/dashboard"
      ? pathname === item.href || pathname === "/admin"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition",
        isActive
          ? admin
            ? "bg-brand-50 text-brand-700"
            : "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
      )}
    >
      <Icon size={17} strokeWidth={1.9} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  admin,
  mobileOpen,
  onClose,
  onOpenSearch,
}: {
  admin: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}) {
  const { state, canAccessAdmin } = useCoursemap();
  const nav = admin ? adminNav : studentNav;
  const initials =
    (state.profile.name || state.profile.email)
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-zinc-950/35 lg:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50/80 px-3 pt-5 pb-3 backdrop-blur transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-200/60 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {!admin && (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search courses"
            className="mt-5 flex h-9 w-full items-center gap-2 rounded-lg bg-white px-2.5 text-zinc-500 shadow-xs ring-1 ring-zinc-200 transition ring-inset hover:ring-zinc-300"
          >
            <SearchIcon size={15} />
            <span className="flex-1 text-left text-xs">Search courses</span>
            <kbd className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              ⌘K
            </kbd>
          </button>
        )}

        <nav
          aria-label={admin ? "Admin navigation" : "Student navigation"}
          className="mt-6 flex flex-col gap-1"
        >
          <p className="px-3 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            {admin ? "Catalogue" : "Your degree"}
          </p>
          {nav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              admin={admin}
              onNavigate={onClose}
            />
          ))}

          {!admin && canAccessAdmin && (
            <>
              <div className="my-1.5 border-t border-zinc-200/80" />
              <Link
                href="/admin/dashboard"
                onClick={onClose}
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Wrench size={17} strokeWidth={1.9} />
                <span>Admin console</span>
              </Link>
            </>
          )}
        </nav>

        <div className="flex-1" />

        {admin && (
          <>
            <div className="-mx-3 mb-1.5 border-t border-zinc-200/80" />
            <Link
              href="/plan"
              onClick={onClose}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Map size={17} strokeWidth={1.9} />
              <span>Back to student plan</span>
            </Link>
          </>
        )}

        {!admin && (
          <a
            href="mailto:support@coursemap.app"
            className="mt-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LifeBuoy size={17} strokeWidth={1.9} />
            <span>Help &amp; support</span>
          </a>
        )}

        <Link
          href="/profile"
          onClick={onClose}
          className="mt-1 flex items-center gap-3 rounded-xl p-2 transition hover:bg-zinc-100"
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
      </aside>
    </>
  );
}
