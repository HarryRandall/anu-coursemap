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
  GitBranch,
  GraduationCap,
  History,
  House,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPin,
  RefreshCw,
  ShieldCheck,
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
  activity: "Activity",
  history: "History",
  profile: "Profile",
  admin: "Admin",
  programmes: "Programmes",
  relations: "Rule review",
  users: "Users",
  roles: "Roles",
  sync: "Imports",
  imports: "Imports",
  new: "New import",
};

/** Each crumb carries the same icon its sidebar entry uses. */
const icons: Record<string, LucideIcon> = {
  academic: ClipboardList,
  activity: ListChecks,
  admin: ShieldCheck,
  calendar: CalendarDays,
  courses: BookOpen,
  dashboard: House,
  help: CircleHelp,
  history: History,
  imports: RefreshCw,
  "key-dates": CalendarDays,
  new: RefreshCw,
  plan: Table,
  profile: UserRound,
  programmes: GraduationCap,
  relations: GitBranch,
  requirements: ListChecks,
  roadmap: Compass,
  roles: KeyRound,
  rooms: MapPin,
  sync: RefreshCw,
  timetable: CalendarDays,
  users: Users,
};

function buildCrumbs(pathname: string): { crumbs: Crumb[]; admin: boolean } {
  const segments = pathname.split("/").filter(Boolean);
  const admin = segments[0] === "admin";
  const crumbs: Crumb[] = [];
  let href = "";

  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    // Dynamic course code segment (e.g. /courses/COMP2100)
    const label =
      admin && segments[1] === "users" && index === 2
        ? "User"
        : admin &&
            (segments[1] === "sync" || segments[1] === "imports") &&
            segment === "history"
          ? "Historical changes"
          : (labels[segment] ?? decodeURIComponent(segment).toUpperCase());
    const icon =
      admin && index === 0
        ? LayoutDashboard
        : (icons[segment] ??
          (/^[A-Z]{4}\d{4}$/iu.test(segment) ? BookOpen : undefined));
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

  // The admin index label ("Overview") when landing on /admin exactly
  if (admin && segments.length === 1) {
    crumbs[0] = { label: "Admin", icon: LayoutDashboard };
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
                size={14}
                className={`shrink-0 text-zinc-300 ${currentLabel ? "hidden sm:block" : ""}`}
              />
            )}
            <li
              className={`min-w-0 ${currentLabel && index < visibleCrumbs.length - 1 ? "hidden sm:block" : ""}`}
            >
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium text-zinc-500 transition hover:text-zinc-800"
                >
                  {crumb.icon ? (
                    <crumb.icon
                      aria-hidden="true"
                      className="shrink-0 text-zinc-400"
                      size={14}
                    />
                  ) : null}
                  <span className="truncate">{crumb.label}</span>
                </Link>
              ) : (
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold text-zinc-900">
                  {crumb.icon ? (
                    <crumb.icon
                      aria-hidden="true"
                      className="shrink-0 text-zinc-500"
                      size={14}
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
