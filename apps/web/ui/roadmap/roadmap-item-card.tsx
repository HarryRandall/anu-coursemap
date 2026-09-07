import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import { routeIcons } from "@/ui/shell/route-icons";
import type { RoadmapArea, RoadmapItem, RoadmapStatus } from "@/lib/roadmap";

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

export function RoadmapItemCard({
  item,
  status,
}: {
  item: RoadmapItem;
  status: RoadmapStatus;
}) {
  const area = areaMeta[item.area];
  const AreaIcon = area.icon;
  const href = status === "shipped" ? item.href : undefined;

  return (
    <li className="h-full">
      <Card className="relative h-full">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <AreaIcon aria-hidden="true" className="size-4" />
            {area.label}
          </div>
          <CardTitle>
            <h3>
              {href ? (
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {item.title}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              ) : (
                item.title
              )}
            </h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </CardContent>
      </Card>
    </li>
  );
}
