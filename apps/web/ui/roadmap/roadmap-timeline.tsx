import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDashed,
  Loader,
  Sparkles,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import { routeIcons } from "@/ui/shell/route-icons";
import { cn } from "@/lib/cn";

export type RoadmapStatus = "shipped" | "now" | "planned" | "exploring";

/** Product area an item belongs to. Maps to the sidebar icon for that route. */
export type RoadmapArea =
  | "plan"
  | "courses"
  | "requirements"
  | "academic"
  | "calendar"
  | "key-dates"
  | "rooms"
  | "profile"
  | "admin"
  | "coursemap";

export type RoadmapItem = {
  title: string;
  description: string;
  area: RoadmapArea;
  /** Where to open a shipped item. */
  href?: string;
};

export type RoadmapStage = {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  items: RoadmapItem[];
};

const areaMeta: Record<RoadmapArea, { label: string; icon: LucideIcon }> = {
  plan: { label: "Plan", icon: routeIcons.plan },
  courses: { label: "Courses", icon: routeIcons.courses },
  requirements: { label: "Requirements", icon: routeIcons.requirements },
  academic: { label: "Academic", icon: routeIcons.academic },
  calendar: { label: "Calendar", icon: routeIcons.calendar },
  "key-dates": { label: "Key dates", icon: routeIcons["key-dates"] },
  rooms: { label: "Room finder", icon: routeIcons.rooms },
  profile: { label: "Profile", icon: routeIcons.profile },
  admin: { label: "Admin", icon: routeIcons.admin },
  coursemap: { label: "Coursemap", icon: Sparkles },
};

const statusMeta: Record<
  RoadmapStatus,
  {
    label: string;
    icon: LucideIcon;
    badge: string;
    node: string;
    strip: string;
  }
> = {
  shipped: {
    label: "Shipped",
    icon: Check,
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    node: "bg-emerald-500 text-white",
    strip: "text-emerald-700 dark:text-emerald-300",
  },
  now: {
    label: "In progress",
    icon: Loader,
    badge: "bg-primary/10 text-primary ring-primary/25",
    node: "bg-primary text-primary-foreground ring-4 ring-primary/20",
    strip: "text-primary",
  },
  planned: {
    label: "Planned",
    icon: CircleDashed,
    badge:
      "bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    node: "bg-card text-sky-600 ring-2 ring-sky-300 dark:text-sky-300 dark:ring-sky-800",
    strip: "text-sky-700 dark:text-sky-300",
  },
  exploring: {
    label: "Exploring",
    icon: Telescope,
    badge: "bg-muted text-muted-foreground ring-border",
    node: "bg-card text-muted-foreground ring-2 ring-input",
    strip: "text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tracking-wide uppercase ring-1",
        meta.badge,
      )}
    >
      <Icon
        size={12}
        strokeWidth={2.5}
        aria-hidden="true"
        className={cn(
          status === "now" && "animate-spin motion-reduce:animate-none",
        )}
        style={status === "now" ? { animationDuration: "3s" } : undefined}
      />
      {meta.label}
    </span>
  );
}

function ItemCard({
  item,
  status,
}: {
  item: RoadmapItem;
  status: RoadmapStatus;
}) {
  const area = areaMeta[item.area];
  const AreaIcon = area.icon;
  const openable = status === "shipped" && item.href;
  const body = (
    <>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <AreaIcon size={12} aria-hidden="true" />
        {area.label}
      </span>
      <h3 className="mt-2 text-[15px] leading-snug font-semibold tracking-tight text-foreground">
        {item.title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </p>
      {openable ? (
        <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          Open
          <ArrowRight
            size={14}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      ) : null}
    </>
  );
  const className = cn(
    "flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-xs",
    status === "exploring" && "border-dashed bg-card/60 shadow-none",
  );

  return (
    <li className="h-full">
      {openable ? (
        <Link
          href={item.href as string}
          className={cn(
            className,
            "group transition hover:border-input hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}

export function RoadmapTimeline({ stages }: { stages: RoadmapStage[] }) {
  return (
    <div className="mx-auto">
      <nav aria-label="Roadmap stages">
        <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {stages.map((stage) => {
            const meta = statusMeta[stage.status];
            const Icon = meta.icon;
            return (
              <li key={stage.id} className="shrink-0">
                <a
                  href={`#${stage.id}`}
                  aria-current={stage.status === "now" ? "step" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-xs transition hover:border-input hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                    stage.status === "now" && "border-primary/40 bg-primary/5",
                  )}
                >
                  <Icon
                    size={14}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className={meta.strip}
                  />
                  {stage.title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <ol className="relative mt-10 space-y-14 before:absolute before:top-3 before:bottom-3 before:left-[0.6875rem] before:w-px before:bg-border sm:mt-12">
        {stages.map((stage) => {
          const meta = statusMeta[stage.status];
          const NodeIcon = meta.icon;
          return (
            <li
              key={stage.id}
              id={stage.id}
              aria-current={stage.status === "now" ? "step" : undefined}
              className="relative scroll-mt-24 pl-10 sm:pl-12"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0.5 left-0 grid size-6 place-items-center rounded-full",
                  meta.node,
                )}
              >
                <NodeIcon size={13} strokeWidth={3} />
              </span>

              <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
                <header className="lg:sticky lg:top-24 lg:self-start">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {stage.title}
                    </h2>
                    {/* The badge is skipped where it would only repeat the title. */}
                    {meta.label !== stage.title ? (
                      <StatusBadge status={stage.status} />
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {stage.description}
                  </p>
                </header>

                <ul className="mt-5 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:mt-0">
                  {stage.items.map((item) => (
                    <ItemCard
                      key={item.title}
                      item={item}
                      status={stage.status}
                    />
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Order and timing change as we learn what students need. Tell us which
          of these would help you most, or what is not here yet.
        </p>
        <Button asChild variant="outline">
          <Link href="/help#contact">
            Request a feature
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
