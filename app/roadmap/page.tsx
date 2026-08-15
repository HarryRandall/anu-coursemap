import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Lightbulb,
  Route,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Tone } from "@/lib/ui";

const sections: Array<{
  title: string;
  description: string;
  tone: Tone;
  icon: typeof Circle;
  items: Array<{ title: string; description: string }>;
}> = [
  {
    title: "Shipped",
    description: "Available in Coursemap now",
    tone: "success",
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
        <section className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm sm:p-8">
          <Badge className="bg-white/10 text-white ring-white/15">
            Product roadmap
          </Badge>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Build the useful things first
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                This roadmap communicates direction, not fixed release dates.
                Priorities can change as catalogue quality and student feedback
                improve.
              </p>
            </div>
            <ButtonLink
              href="mailto:support@coursemap.app?subject=Coursemap%20feature%20request"
              variant="secondary"
              className="border-0 bg-white text-zinc-900 hover:bg-zinc-100"
            >
              Suggest a feature <Lightbulb size={15} />
            </ButtonLink>
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="overflow-hidden">
                <div className="border-b border-zinc-100 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                      <Icon size={17} />
                    </span>
                    <Badge tone={section.tone}>{section.title}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    {section.description}
                  </p>
                </div>
                <ol className="divide-y divide-zinc-100">
                  {section.items.map((item) => (
                    <li key={item.title} className="p-5">
                      <h2 className="text-[13px] font-semibold text-zinc-900">
                        {item.title}
                      </h2>
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

        <Card className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Something important missing?
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Tell us what would make planning your degree noticeably easier.
            </p>
          </div>
          <ButtonLink href="/help" variant="secondary" size="sm">
            Open support portal <ArrowRight size={14} />
          </ButtonLink>
        </Card>
      </div>
    </AppShell>
  );
}
