import Link from "next/link";
import {
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronsUp,
  Circle,
  Clock3,
  Database,
  Gauge,
  GitCompare,
  Import,
  Keyboard,
  LayoutDashboard,
  Lock,
  Map,
  MapPin,
  Search,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Split,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  filterRoadmapItems,
  roadmapAreaLabels,
  roadmapAreas,
  roadmapStages,
  type RoadmapArea,
  type RoadmapIconName,
  type RoadmapItem,
  type RoadmapStage,
} from "@/lib/roadmap";

const icons: Record<RoadmapIconName, LucideIcon> = {
  map: Map,
  search: Search,
  layout: LayoutDashboard,
  lock: Lock,
  keyboard: Keyboard,
  database: Database,
  list: ListChecks,
  shield: Shield,
  import: Import,
  calendar: CalendarDays,
  award: Award,
  pin: MapPin,
  clock: Clock3,
  gauge: Gauge,
  git: GitCompare,
  share: Share2,
  bell: Bell,
  split: Split,
  smartphone: Smartphone,
};

const stageStyle: Record<
  RoadmapStage,
  {
    icon: LucideIcon;
    rail: string;
    tint: string;
    dot: string;
    badge: "success" | "brand" | "info" | "neutral";
  }
> = {
  shipped: {
    icon: CheckCircle2,
    rail: "bg-emerald-400",
    tint: "bg-emerald-50/80",
    dot: "bg-emerald-500",
    badge: "success",
  },
  now: {
    icon: Sparkles,
    rail: "bg-brand-500",
    tint: "bg-brand-50/80",
    dot: "bg-brand-500",
    badge: "brand",
  },
  next: {
    icon: Clock3,
    rail: "bg-sky-400",
    tint: "bg-sky-50/80",
    dot: "bg-sky-500",
    badge: "info",
  },
  later: {
    icon: Circle,
    rail: "bg-zinc-300",
    tint: "bg-zinc-100/80",
    dot: "bg-zinc-400",
    badge: "neutral",
  },
};

export function RoadmapBoard({ area }: { area?: RoadmapArea }) {
  const items = filterRoadmapItems(area);
  const counts = roadmapStages.map((stage) => items[stage.id].length);
  const shippedRatio =
    counts.reduce((sum, count) => sum + count, 0) === 0
      ? 0
      : counts[0] / counts.reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Filter roadmap by area" className="flex flex-wrap gap-2">
        <FilterChip href="/roadmap" active={!area} label="All" />
        {roadmapAreas.map((item) => (
          <FilterChip
            key={item}
            href={`/roadmap?area=${item}`}
            active={area === item}
            label={roadmapAreaLabels[item]}
          />
        ))}
      </nav>

      <section
        aria-label="Roadmap timeline"
        className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-zinc-200/70 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Product timeline
          </p>
          <p className="text-xs text-zinc-500">
            {Math.round(shippedRatio * 100)}% of the board has already shipped
          </p>
        </div>
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute top-[7px] right-3 left-3 hidden h-px bg-zinc-200 lg:block"
          />
          <span
            aria-hidden="true"
            className="absolute top-[7px] left-3 hidden h-px bg-linear-to-r from-emerald-400 via-brand-400 to-brand-300 lg:block"
            style={{ width: `${Math.max(18, shippedRatio * 100)}%` }}
          />
          <ol className="relative grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
            {roadmapStages.map((stage, index) => {
              const style = stageStyle[stage.id];
              const count = counts[index];
              return (
                <li key={stage.id} className="min-w-0">
                  <span
                    className={cn(
                      "relative z-10 mb-3 block size-3.5 rounded-full ring-4 ring-white",
                      style.dot,
                      stage.id === "now" && "animate-roadmap-pulse",
                    )}
                  >
                    <span className="sr-only">{stage.title} marker</span>
                  </span>
                  <p className="text-sm font-semibold text-zinc-900">
                    {stage.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                    {count} {count === 1 ? "item" : "items"} ·{" "}
                    {stage.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="roadmap-surface -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max snap-x snap-mandatory gap-4 lg:grid lg:min-w-0 lg:grid-cols-4">
          {roadmapStages.map((stage) => (
            <RoadmapColumn
              key={stage.id}
              stage={stage.id}
              title={stage.title}
              description={stage.description}
              items={items[stage.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-semibold transition",
        active
          ? "bg-zinc-900 text-white shadow-sm"
          : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900",
      )}
    >
      {label}
    </Link>
  );
}

function RoadmapColumn({
  stage,
  title,
  description,
  items,
}: {
  stage: RoadmapStage;
  title: string;
  description: string;
  items: RoadmapItem[];
}) {
  const style = stageStyle[stage];
  const Icon = style.icon;

  return (
    <section
      aria-labelledby={`roadmap-${stage}`}
      className="flex w-[18.5rem] shrink-0 snap-start flex-col lg:w-auto"
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl ring-1 ring-zinc-200/80",
          style.tint,
        )}
      >
        <div className={cn("h-1 w-full", style.rail)} />
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-white text-zinc-700 shadow-xs ring-1 ring-zinc-200/80">
                <Icon size={16} aria-hidden="true" />
              </span>
              <h2
                id={`roadmap-${stage}`}
                className="text-sm font-semibold tracking-tight text-zinc-900"
              >
                {title}
              </h2>
              {stage === "now" ? (
                <Badge tone="brand" className="gap-1">
                  <span className="size-1.5 rounded-full bg-brand-500" />
                  In flight
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              {description}
            </p>
          </div>
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
            {items.length}
            <span className="sr-only"> items</span>
          </span>
        </div>
      </div>

      <ol className="mt-3 flex flex-col gap-3">
        {items.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 px-3 py-10 text-center text-xs text-zinc-400">
            Nothing in this lane
          </li>
        ) : (
          items.map((item, index) => (
            <li key={item.id}>
              <RoadmapCard item={item} stage={stage} index={index} />
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function RoadmapCard({
  item,
  stage,
  index,
}: {
  item: RoadmapItem;
  stage: RoadmapStage;
  index: number;
}) {
  const Icon = icons[item.icon];
  const style = stageStyle[stage];

  return (
    <article
      className="animate-roadmap-card rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80 transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl text-zinc-700",
            style.tint,
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        {item.version ? (
          <Badge tone="success">{item.version}</Badge>
        ) : item.quarter ? (
          <Badge tone={style.badge}>{item.quarter}</Badge>
        ) : null}
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-tight text-zinc-900">
        {item.title}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
        {item.description}
      </p>
      {item.progress != null ? (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
            <span>Progress</span>
            <span className="tabular-nums">{item.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.progress}
            aria-label={`${item.title} progress`}
            className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <Badge>{roadmapAreaLabels[item.area]}</Badge>
        <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-zinc-500">
          <ChevronsUp size={14} aria-hidden="true" />
          <span className="tabular-nums">{item.votes}</span>
          <span className="sr-only"> people interested</span>
        </span>
        <GeneratedAvatar name={item.owner} className="size-6 text-[9px]" />
      </div>
    </article>
  );
}
