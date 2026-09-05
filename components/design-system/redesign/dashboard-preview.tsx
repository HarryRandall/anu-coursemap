"use client";

import { MetricOptions } from "./metric-options";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Dialog, DropdownMenu } from "radix-ui";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { Input } from "@uui/components/base/input/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@reui/ui/breadcrumb";
import { useLabTheme } from "../lab/lab-theme-provider";
import {
  previewCourses,
  previewPlan,
  previewRequirements,
  previewTerms,
} from "./fixtures";
import styles from "./dashboard-preview.module.css";
import { DegreeProgressCard } from "./progress-card-picker";

const navigation = [
  { title: "Overview", icon: LayoutDashboard, href: "/design-system/redesign" },
  { title: "My plan", icon: CalendarDays, href: "/plan" },
  { title: "Explore courses", icon: Compass, href: "/courses" },
  {
    title: "Requirements",
    icon: ListChecks,
    href: "/requirements",
    badge: "2",
  },
  { title: "Academic record", icon: GraduationCap, href: "/academic" },
];

function Brand() {
  return (
    <span className={styles.brand}>
      <span>
        <GraduationCap size={19.8} />
      </span>
      <b>coursemap</b>
    </span>
  );
}
function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className}`}>
      <div className={styles.panelHeading}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function SmallLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className={styles.smallLink} href={href}>
      {children}
      <ArrowRight size={12.6} />
    </Link>
  );
}

function HeaderBreadcrumbs() {
  const { resolved } = useLabTheme();
  return (
    <Breadcrumb className={styles.breadcrumbs} aria-label="Breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              className={styles.crumbTrigger}
              aria-label="My studies navigation"
            >
              <GraduationCap size={16.2} />
              <span>My studies</span>
              <ChevronDown size={11.7} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={8}
                className={`${styles.tokens} ${styles.accountMenu}`}
                data-theme={resolved}
              >
                <DropdownMenu.Label>My studies</DropdownMenu.Label>
                {navigation.slice(1).map((item) => (
                  <DropdownMenu.Item asChild key={item.href}>
                    <Link href={item.href}>
                      <item.icon size={14.4} />
                      {item.title}
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight size={12.6} />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage className={styles.currentCrumb}>
            <LayoutDashboard size={14.4} />
            Overview
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function SearchControl() {
  const { resolved } = useLabTheme();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (inputRef.current?.getClientRects().length) inputRef.current.focus();
        else setOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
      <form action="/courses" role="search" className={styles.headerSearch}>
        <Input
          ref={inputRef}
          name="q"
          type="search"
          size="sm"
          icon={Search}
          aria-label="Search courses"
          placeholder="Search courses..."
          className={styles.searchInput}
          wrapperClassName={styles.searchInputWrapper}
          inputClassName={styles.searchInputField}
          iconClassName={styles.searchInputIcon}
        />
        <button
          type="submit"
          className={styles.searchSubmit}
          aria-label="Search catalogue"
        >
          <ArrowRight size={14.4} />
        </button>
      </form>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.mobileSearch}`}
            aria-label="Search courses"
            aria-keyshortcuts="Meta+k Control+k"
          >
            <Search size={16.2} />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={`${styles.tokens} ${styles.searchDialog}`}
            data-theme={resolved}
          >
            <Dialog.Title>Search courses</Dialog.Title>
            <Dialog.Description className={styles.srOnly}>
              Search the catalogue by course code or name.
            </Dialog.Description>
            <form className={styles.searchForm} action="/courses">
              <Input
                autoFocus
                name="q"
                type="search"
                label="Course code or name"
                placeholder="e.g. COMP2100"
              />
              <div>
                <Dialog.Close asChild>
                  <button type="button">Cancel</button>
                </Dialog.Close>
                <button type="submit">
                  Search courses <ArrowRight size={13.5} />
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
function AccountMenu() {
  const { resolved } = useLabTheme();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={styles.account}
          aria-label="Account menu"
        >
          <span>JS</span>
          <ChevronDown size={12.6} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={`${styles.tokens} ${styles.accountMenu}`}
          data-theme={resolved}
        >
          <DropdownMenu.Label>
            Jamie Smith <small>Sample student</small>
          </DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href="/profile">
              <Settings size={13.5} /> Profile & settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/help">
              <CircleHelp size={13.5} /> Help centre
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item asChild>
            <Link href="/design-system/shortlist">
              <LogOut size={13.5} /> Back to component review
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
function Notifications() {
  const { resolved } = useLabTheme();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="View two plan notices"
        >
          <Bell size={16.2} />
          <i />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${styles.tokens} ${styles.searchDialog}`}
          data-theme={resolved}
        >
          <Dialog.Title>Your plan needs a quick look</Dialog.Title>
          <Dialog.Description>
            Two courses in the sample plan need prerequisite checks.
          </Dialog.Description>
          <ul className={styles.noticeList}>
            {previewCourses
              .filter((c) => c.tone === "amber")
              .map((c) => (
                <li key={c.code}>
                  <strong>{c.code}</strong>
                  <span>{c.name}</span>
                </li>
              ))}
          </ul>
          <SmallLink href="/requirements">Open requirements</SmallLink>
          <Dialog.Close asChild>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Close notices"
            >
              <X size={16.2} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function NavLinks({ compact = false }: { compact?: boolean }) {
  return (
    <nav aria-label="Main navigation">
      {navigation.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={i === 0 ? "page" : undefined}
          className={styles.navItem}
          title={compact ? item.title : undefined}
        >
          <item.icon size={16.2} />
          <span className={compact ? styles.srOnly : undefined}>
            {item.title}
          </span>
          {item.badge && !compact && <small>{item.badge}</small>}
        </Link>
      ))}
    </nav>
  );
}
function MobileMenu() {
  const { resolved } = useLabTheme();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.mobileToggle}`}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${styles.tokens} ${styles.drawer}`}
          data-theme={resolved}
        >
          <Dialog.Title className={styles.srOnly}>
            Coursemap navigation
          </Dialog.Title>
          <Dialog.Description className={styles.srOnly}>
            Open a section of Coursemap.
          </Dialog.Description>
          <Brand />
          <NavLinks />
          <Dialog.Close asChild>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Close navigation"
            >
              <X size={16.2} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function SemesterLoad() {
  const terms = previewTerms.slice(4);
  return (
    <Panel
      title="Semester load"
      action={<SmallLink href="/plan">View plan</SmallLink>}
    >
      <div className={styles.chartIntro}>
        <strong>Upcoming semesters</strong>
      </div>
      <div
        className={styles.chart}
        role="img"
        aria-label={terms
          .map((t) => `${t.name}: ${t.completed + t.remaining} units`)
          .join(", ")}
      >
        <div className={styles.chartGuide}>
          <span>24</span>
        </div>
        <div className={styles.bars}>
          {terms.map((t) => (
            <div key={t.name}>
              <div className={styles.barTrack}>
                <span
                  data-finished={t.completed > 0}
                  style={{
                    height: `${((t.completed + t.remaining) / 30) * 100}%`,
                  }}
                >
                  <b>{t.completed + t.remaining || ""}</b>
                </span>
              </div>
              <small>{t.name}</small>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.chartFoot}>
        30 units are still available to allocate.
        <SmallLink href="/plan">Balance your plan</SmallLink>
      </div>
    </Panel>
  );
}
function CourseTable() {
  const [sort, setSort] = useState(false);
  const courses = [...previewCourses].sort((a, b) =>
    sort ? b.code.localeCompare(a.code) : a.code.localeCompare(b.code),
  );
  return (
    <Panel
      title="Next in your plan"
      action={<SmallLink href="/plan">Edit plan</SmallLink>}
    >
      <div className={styles.tableMeta}>
        <span>Semester 1, 2027</span>
        <span>4 courses · 24 units</span>
      </div>
      <div className={styles.tableScroll}>
        <table>
          <caption className={styles.srOnly}>
            Sample courses planned for Semester 1, 2027
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={sort ? "descending" : "ascending"}>
                <button type="button" onClick={() => setSort(!sort)}>
                  Course{" "}
                  {sort ? <ArrowDown size={11.7} /> : <ArrowUp size={11.7} />}
                </button>
              </th>
              <th scope="col">Units</th>
              <th scope="col">Readiness</th>
              <th scope="col">
                <span className={styles.srOnly}>Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.code}>
                <td>
                  <div className={styles.courseIdentity}>
                    <span data-maths={c.code.startsWith("MATH")}>
                      {c.code.startsWith("MATH") ? "M" : "C"}
                    </span>
                    <div>
                      <strong>{c.code}</strong>
                      <p>{c.name}</p>
                    </div>
                  </div>
                </td>
                <td>{c.units}</td>
                <td>
                  <span className={styles.statusBadge} data-tone={c.tone}>
                    {c.tone === "green" ? (
                      <Check size={10.8} />
                    ) : (
                      <ListChecks size={10.8} />
                    )}{" "}
                    {c.status}
                  </span>
                </td>
                <td>
                  <Link
                    className={styles.iconButton}
                    href={`/courses/${c.code}`}
                    aria-label={`View ${c.code}`}
                  >
                    <ChevronRight size={15.3} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function Requirements({
  requirements = previewRequirements,
}: {
  requirements?: typeof previewRequirements;
}) {
  return (
    <Panel
      title="Degree requirements"
      action={<SmallLink href="/requirements">View all</SmallLink>}
    >
      <div className={styles.requirements}>
        {requirements.length ? (
          requirements.map((r) => (
            <Link
              href="/requirements"
              key={r.title}
              className={styles.requirementRow}
            >
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.completed} of {r.total} units complete
                </small>
              </span>
              <span className={styles.miniProgress} aria-hidden="true">
                <i
                  style={{
                    width:
                      r.total > 0
                        ? Math.min(100, (r.completed / r.total) * 100) + "%"
                        : "0%",
                  }}
                />
              </span>
              <ChevronRight size={14} />
            </Link>
          ))
        ) : (
          <p className={styles.requirementsEmpty}>
            Detailed requirements are not available for this degree yet. Your
            unit progress is shown separately.
          </p>
        )}
      </div>
    </Panel>
  );
}
function Dates() {
  return (
    <Panel title="Upcoming dates" action={<CalendarDays size={14.4} />}>
      <ol className={styles.dates}>
        <li>
          <time>
            <strong>18</strong>SEP
          </time>
          <div>
            <strong>Mid-semester break</strong>
          </div>
        </li>
        <li>
          <time>
            <strong>02</strong>NOV
          </time>
          <div>
            <strong>Examination period</strong>
          </div>
        </li>
      </ol>
      <div className={styles.datesFooter}>
        <SmallLink href="/key-dates">Academic calendar</SmallLink>
      </div>
    </Panel>
  );
}

function Preview() {
  const [collapsed, setCollapsed] = useState(false);
  const { resolved, setTheme } = useLabTheme();
  return (
    <div
      className={`${styles.tokens} ${styles.page} reui-scope style-nova`}
      data-theme={resolved}
      data-collapsed={collapsed}
    >
      <div className={styles.app}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <Link
              href="/design-system/redesign"
              aria-label="Coursemap overview"
            >
              <Brand />
            </Link>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={15.3} />
              ) : (
                <PanelLeftClose size={15.3} />
              )}
            </button>
          </div>
          {!collapsed && (
            <div className={styles.planSwitch}>
              <span className={styles.planIcon}>
                <GraduationCap size={17.1} />
              </span>
              <div>
                <strong>My degree plan</strong>
                <small>{previewPlan.commencement} commencement</small>
              </div>
            </div>
          )}
          <NavLinks compact={collapsed} />
          {!collapsed && (
            <>
              <div className={styles.sidebarSecondary}>
                <span>RESOURCES</span>
                <Link href="/key-dates">
                  <CalendarDays size={15.3} /> Key dates
                </Link>
                <Link href="/help">
                  <CircleHelp size={15.3} /> Help centre
                </Link>
              </div>
              <div className={styles.sidebarProgress}>
                <div>
                  <span>Your degree</span>
                  <strong>25%</strong>
                </div>
                <span>
                  <i />
                </span>
                <small>48 of 192 units completed</small>
                <Link href="/plan">
                  Keep your plan moving <ArrowRight size={12.6} />
                </Link>
              </div>
            </>
          )}
          <div className={styles.sidebarBottom}>
            <span className={styles.avatar}>JS</span>
            {!collapsed && (
              <div>
                <strong>Jamie Smith</strong>
                <small>ANU student</small>
              </div>
            )}
          </div>
        </aside>
        <div className={styles.workspace}>
          <header className={styles.toolbar}>
            <div>
              <MobileMenu />
              <HeaderBreadcrumbs />
            </div>
            <div className={styles.toolbarActions}>
              <SearchControl />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() =>
                  setTheme(resolved === "light" ? "dark" : "light")
                }
                aria-label={`Switch to ${resolved === "light" ? "dark" : "light"} mode`}
              >
                {resolved === "light" ? (
                  <Moon size={16.2} />
                ) : (
                  <Sun size={16.2} />
                )}
              </button>
              <Notifications />
              <AccountMenu />
            </div>
          </header>
          <main className={styles.main}>
            <h1 className={styles.srOnly}>Degree overview</h1>
            <div className={styles.overviewHero}>
              <DegreeProgressCard />
              <Requirements />
            </div>
            <MetricOptions />
            <div className={styles.overviewLower}>
              <CourseTable />
              <div>
                <SemesterLoad />
                <Dates />
              </div>
            </div>
            <footer className={styles.footer}>
              <span>
                Coursemap <span>·</span> Sample student data
              </span>
              <Link href="/help">
                Help & support <ArrowRight size={11.7} />
              </Link>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
export function DashboardPreview() {
  return <Preview />;
}
