import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { Badge } from "@coursemap/ui/components/badge";
import { Card, CardContent } from "@coursemap/ui/primitives/card";
import { RoadmapItemCard } from "@/ui/roadmap/roadmap-item-card";
import {
  ArrowRight,
  Check,
  CircleDashed,
  Loader,
  Telescope,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

import type { RoadmapStatus, RoadmapStage } from "@/lib/roadmap";

const statusMeta: Record<
  RoadmapStatus,
  {
    label: string;
    icon: LucideIcon;
    badge: "success-light" | "primary-light" | "info-light" | "secondary";
    node: string;
  }
> = {
  shipped: {
    label: "Shipped",
    icon: Check,
    badge: "success-light",
    node: "bg-emerald-500 text-white",
  },
  now: {
    label: "In progress",
    icon: Loader,
    badge: "primary-light",
    node: "bg-primary text-primary-foreground ring-4 ring-primary/20",
  },
  planned: {
    label: "Planned",
    icon: CircleDashed,
    badge: "info-light",
    node: "bg-card text-sky-600 ring-2 ring-sky-300 dark:text-sky-300 dark:ring-sky-800",
  },
  exploring: {
    label: "Exploring",
    icon: Telescope,
    badge: "secondary",
    node: "bg-card text-muted-foreground ring-2 ring-input",
  },
};

export function RoadmapTimeline({ stages }: { stages: RoadmapStage[] }) {
  return (
    <div className="mx-auto">
      <ol className="relative space-y-10 before:absolute before:top-3 before:bottom-3 before:left-[0.6875rem] before:w-px before:bg-border">
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
                <header>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      {stage.title}
                    </h2>
                    {/* The badge is skipped where it would only repeat the title. */}
                    {meta.label !== stage.title ? (
                      <Badge variant={meta.badge}>
                        <NodeIcon aria-hidden="true" />
                        {meta.label}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {stage.description}
                  </p>
                </header>

                <ul className="mt-5 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:mt-0">
                  {stage.items.map((item) => (
                    <RoadmapItemCard
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

      <Card className="mt-10">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Order and timing change as we learn what students need. Tell us
            which of these would help you most, or what is not here yet.
          </p>
          <Button asChild variant="outline">
            <Link href="/help#contact">
              Request a feature
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
