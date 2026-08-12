"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Database,
  GitBranch,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  Map,
  Menu,
  RefreshCw,
  Search,
  Table2,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { degreeByCode, majorByCode } from "@/lib/catalogue";

type ShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  admin?: boolean;
  fullBleed?: boolean;
};

const studentNav = [
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/requirements", label: "Requirements", icon: ListChecks },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
];

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: Table2 },
  { href: "/admin/programmes", label: "Programmes", icon: GraduationCap },
  { href: "/admin/relations", label: "Relations", icon: GitBranch },
  { href: "/admin/sync", label: "Sync", icon: RefreshCw },
];

function Brand() {
  return (
    <Link className="brand" href="/plan" aria-label="Coursemap home">
      <span className="brand-grid" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <strong>coursemap</strong>
      <span>beta</span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: typeof Map;
  pathname: string;
}) {
  const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
  return (
    <Link className={isActive ? "side-link active" : "side-link"} href={href}>
      <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  admin = false,
  fullBleed = false,
}: ShellProps) {
  const pathname = usePathname();
  const { state, updateProfile } = useCoursemap();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = admin ? adminNav : studentNav;
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const initials = state.profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={admin ? "app-frame admin-mode" : "app-frame"}>
      <aside className={mobileOpen ? "app-sidebar mobile-open" : "app-sidebar"}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="mobile-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-context">
          <span className={admin ? "context-icon admin" : "context-icon"}>
            {admin ? <Database size={16} /> : degree.code.slice(0, 2)}
          </span>
          <span>
            <strong>{admin ? "Catalogue admin" : degree.name}</strong>
            <small>{admin ? "Prototype data console" : major.name}</small>
          </span>
        </div>

        <nav className="side-nav" aria-label={admin ? "Admin navigation" : "Student navigation"}>
          <p>{admin ? "Catalogue" : "Your degree"}</p>
          {nav.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>

        <div className="sidebar-fill" />

        {admin ? (
          <Link className="side-link back-to-plan" href="/plan">
            <Map size={17} strokeWidth={1.8} />
            <span>Back to student plan</span>
          </Link>
        ) : (
          <Link className={pathname === "/admin" ? "side-link active" : "side-link"} href="/admin">
            <Database size={17} strokeWidth={1.8} />
            <span>Data admin</span>
          </Link>
        )}

        <Link className="profile-link" href="/profile">
          <span className="avatar">{initials || "HS"}</span>
          <span>
            <strong>{state.profile.name || "Set up profile"}</strong>
            <small>{state.profile.studentId || "Add student ID"}</small>
          </span>
          <UserRound size={15} aria-hidden="true" />
        </Link>
      </aside>

      {mobileOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <div className="app-main">
        <header className="app-header">
          <div className="header-title">
            <button className="mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <span>
              <strong>{title}</strong>
              {subtitle && <small>{subtitle}</small>}
            </span>
          </div>
          <div className="header-actions">
            {admin && (
              <label className="year-control">
                <span>Year</span>
                <select
                  aria-label="Admin catalogue year"
                  value={state.profile.catalogueYear}
                  onChange={(event) => updateProfile({ catalogueYear: Number(event.target.value) })}
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </label>
            )}
            {!admin && pathname !== "/courses" && (
              <Link className="header-search" href="/courses">
                <Search size={16} />
                <span>Search courses</span>
                <kbd>⌘ K</kbd>
              </Link>
            )}
            {actions}
          </div>
        </header>

        <main className={fullBleed ? "page-content full-bleed" : "page-content"}>{children}</main>
      </div>
    </div>
  );
}
