import { CheckCircle2, Circle, Clock3, Route } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Tone } from "@/lib/ui";

const stages: Array<{
  title: string;
  description: string;
  tone: Tone;
  rail: string;
  icon: typeof Circle;
  items: Array<{ title: string; description: string }>;
}> = [
  {
    title: "Shipped",
    description: "Available in Coursemap now",
    tone: "success",
    rail: "bg-emerald-400",
    icon: CheckCircle2,
    items: [
      {
        title: "Visual degree planning",
        description:
          "Build a semester-by-semester plan and move courses as it changes.",
      },
      {
        title: "Course and prerequisite discovery",
        description: "Search courses and explore full prerequisite chains.",
      },
      {
        title: "Student workspace",
        description:
          "Home, academic history, requirements, calendar and support pages.",
      },
    ],
  },
  {
    title: "Now",
    description: "The current product focus",
    tone: "brand",
    rail: "bg-brand-500",
    icon: Clock3,
    items: [
      {
        title: "Catalogue coverage",
        description:
          "Broaden degree, major and course data while keeping its source visible.",
      },
      {
        title: "Requirement accuracy",
        description:
          "Improve allocation detail and flag rules that still need review.",
      },
      {
        title: "Account administration",
        description:
          "Make access and support workflows safer for the Coursemap team.",
      },
    ],
  },
  {
    title: "Next",
    description: "Useful additions we want to explore",
    tone: "info",
    rail: "bg-sky-400",
    icon: Route,
    items: [
      {
        title: "Assessment calendar",
        description:
          "Bring assessments and important dates into the study calendar.",
      },
      {
        title: "Credit and exemptions",
        description:
          "Represent recognised prior learning without overstating official status.",
      },
      {
        title: "Room Finder",
        description: "Search campus spaces, facilities and accessible routes.",
      },
    ],
  },
  {
    title: "Later",
    description: "Ideas without a committed delivery date",
    tone: "neutral",
    rail: "bg-zinc-300",
    icon: Circle,
    items: [
      {
        title: "Compare degree options",
        description:
          "Try another major or programme without changing your saved plan.",
      },
      {
        title: "Share and export",
        description:
          "Create a clear plan summary for advisers or your own records.",
      },
      {
        title: "Planning reminders",
        description:
          "Choose useful reminders for deadlines and unresolved plan items.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <AppShell title="Roadmap" subtitle="Where Coursemap is heading">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.title} className="overflow-hidden">
                <div className={`h-1 w-full ${stage.rail}`} />
                <div className="flex items-start gap-3 border-b border-zinc-100 p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2>
                      <Badge tone={stage.tone}>{stage.title}</Badge>
                    </h2>
                    <p className="mt-2 text-xs text-zinc-500">
                      {stage.description}
                    </p>
                  </div>
                </div>
                <ol className="divide-y divide-zinc-100">
                  {stage.items.map((item) => (
                    <li key={item.title} className="p-5">
                      <h3 className="text-[13px] font-semibold text-zinc-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
