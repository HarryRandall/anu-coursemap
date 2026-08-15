"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

type Crumb = { label: string; href?: string };

const labels: Record<string, string> = {
  dashboard: "Home",
  plan: "Plan",
  requirements: "Requirements",
  courses: "Courses",
  academic: "Academic",
  calendar: "Calendar",
  roadmap: "Roadmap",
  rooms: "Room finder",
  help: "Help & support",
  timetable: "Timetable",
  history: "History",
  profile: "Profile",
  admin: "Admin",
  programmes: "Programmes",
  relations: "Rule review",
  users: "Users",
  roles: "Roles",
  sync: "Imports",
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
        : (labels[segment] ?? decodeURIComponent(segment).toUpperCase());
    crumbs.push({
      label,
      href: isLast
        ? undefined
        : admin && index === 0
          ? "/admin/dashboard"
          : href,
    });
  });

  // The admin index label ("Overview") when landing on /admin exactly
  if (admin && segments.length === 1) crumbs[0] = { label: "Admin" };

  return { crumbs, admin };
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { crumbs } = buildCrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRight size={14} className="shrink-0 text-zinc-300" />
            )}
            <li className="min-w-0">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate text-[13px] font-medium text-zinc-500 transition hover:text-zinc-800"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate text-[13px] font-semibold text-zinc-900">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
