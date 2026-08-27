"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CircleHelp,
  Compass,
  GitCompareArrows,
  GraduationCap,
  House,
  Import,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPin,
  RefreshCw,
  Shield,
  Table,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Fragment } from "react";

type Crumb = { label: string; href?: string; icon?: LucideIcon };

const labels: Record<string, string> = {
  dashboard: "Home",
  plan: "Plan",
  requirements: "Requirements",
  courses: "Courses",
  academic: "Academic",
  calendar: "Calendar",
  "key-dates": "Key dates",
  roadmap: "Roadmap",
  rooms: "Room finder",
  help: "Help & support",
  "build-your-plan": "Build your plan",
  "understand-a-course": "Understand a course",
  "read-requirements": "Read requirements",
  "account-and-degree": "Account and degree",
  "study-calendar": "Use the study calendar",
  "academic-record": "Read your academic record",
  timetable: "Timetable",
  profile: "Profile",
  admin: "Admin",
  programmes: "Programmes",
  users: "Users",
  roles: "Roles",
  imports: "Imports",
  sync: "Sync",
  changes: "Changes",
};

/**
 * Each crumb carries the same icon its sidebar entry uses. Admin dashboard
 * reuses the grid mark; the student home route keeps the house.
 */
const icons: Record<string, LucideIcon> = {
  academic: ClipboardList,
  admin: Shield,
  calendar: CalendarDays,
  changes: GitCompareArrows,
  courses: BookOpen,
  dashboard: House,
  help: CircleHelp,
  imports: Import,
  "key-dates": CalendarDays,
  plan: Table,
  profile: UserRound,
  programmes: GraduationCap,
  requirements: ListChecks,
  roadmap: Compass,
  roles: KeyRound,
  rooms: MapPin,
  sync: RefreshCw,
  timetable: CalendarDays,
  users: Users,
};

const COURSE_CODE_SEGMENT = /^[A-Z]{4}\d{4}$/iu;

/**
 * Only course codes are shouted. Upper-casing every unmapped segment turned
 * ordinary path parts into headlines -- /admin/imports/runs read as "RUNS".
 */
function fallbackLabel(segment: string) {
  const value = decodeURIComponent(segment);
  if (COURSE_CODE_SEGMENT.test(value)) return value.toUpperCase();
  const words = value.replace(/[-_]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildCrumbs(pathname: string): { crumbs: Crumb[]; admin: boolean } {
  const segments = pathname.split("/").filter(Boolean);
  const admin = segments[0] === "admin";
  const crumbs: Crumb[] = [];
  let href = "";

  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const isAdminDashboard = admin && segment === "dashboard";
    const label = isAdminDashboard
      ? "Dashboard"
      : (labels[segment] ?? fallbackLabel(segment));
    const icon = isAdminDashboard
      ? LayoutDashboard
      : (icons[segment] ??
        (COURSE_CODE_SEGMENT.test(segment) ? BookOpen : undefined));
    crumbs.push({
      icon,
      label,
      href: isLast
        ? undefined
        : admin && index === 0
          ? "/admin/dashboard"
          : href,
    });
  });

  if (admin && segments.length === 1) {
    crumbs[0] = { label: "Admin", icon: Shield };
  }

  return { crumbs, admin };
}

export function Breadcrumbs({ currentLabel }: { currentLabel?: string }) {
  const pathname = usePathname();
  const { crumbs } = buildCrumbs(pathname);
  const visibleCrumbs = currentLabel
    ? crumbs.map((crumb, index) =>
        index === crumbs.length - 1 ? { ...crumb, label: currentLabel } : crumb,
      )
    : crumbs;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <ol className="flex min-w-0 items-center gap-1.5">
        {visibleCrumbs.map((crumb, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRight
                aria-hidden="true"
                className={`block size-3.5 shrink-0 text-zinc-300 ${currentLabel ? "hidden sm:block" : ""}`}
              />
            )}
            <li
              className={`min-w-0 ${currentLabel && index < visibleCrumbs.length - 1 ? "hidden sm:block" : ""}`}
            >
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="flex min-w-0 items-center gap-1.5 text-[13px] leading-none font-medium text-zinc-500 transition hover:text-zinc-800"
                >
                  {crumb.icon ? (
                    <crumb.icon
                      aria-hidden="true"
                      className="block size-3.5 shrink-0 text-zinc-400"
                    />
                  ) : null}
                  <span className="truncate">{crumb.label}</span>
                </Link>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-none font-semibold text-zinc-900">
                  {crumb.icon ? (
                    <crumb.icon
                      aria-hidden="true"
                      className="block size-3.5 shrink-0 text-zinc-500"
                    />
                  ) : null}
                  <span className="truncate">{crumb.label}</span>
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
