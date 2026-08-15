import { Check } from "lucide-react";
import { AppShell } from "@/components/shell";
import { cn } from "@/lib/cn";

/** Index of the stage in progress. The track is drawn as complete up to here. */
const currentStage = 1;

const stages: Array<{
  title: string;
  description: string;
  items: Array<{ title: string; description: string }>;
}> = [
  {
    title: "Shipped",
    description: "Available in Coursemap now",
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
      <div className="mx-auto max-w-7xl px-1 py-2 sm:py-6">
        <ol className="flex flex-col lg:flex-row">
          {stages.map((stage, index) => {
            const above = index % 2 === 0;
            const done = index < currentStage;
            const current = index === currentStage;
            const future = index > currentStage;

            return (
              <li
                key={stage.title}
                className="flex gap-4 lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-0"
              >
                <div
                  className={cn(
                    "order-2 min-w-0 flex-1 pb-9 lg:flex lg:h-72 lg:flex-none lg:border-l-2 lg:pr-8 lg:pb-0 lg:pl-5",
                    above
                      ? "lg:order-1 lg:items-end"
                      : "lg:order-3 lg:items-start",
                    current && "lg:border-brand-400",
                    done && "lg:border-brand-200",
                    future && "lg:border-zinc-200",
                  )}
                >
                  <div className={above ? "lg:pb-8" : "lg:pt-8"}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "text-[10px] font-semibold tracking-[0.2em]",
                        future ? "text-zinc-300" : "text-brand-400",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-zinc-900">
                      {stage.title}
                      {current && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-brand-700 uppercase ring-1 ring-brand-200">
                          In progress
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {stage.description}
                    </p>

                    <ul className="mt-5 space-y-4">
                      {stage.items.map((item) => (
                        <li key={item.title} className="group flex gap-2.5">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-[7px] h-px w-3 shrink-0 transition-all group-hover:w-5",
                              future ? "bg-zinc-300" : "bg-brand-400",
                            )}
                          />
                          <div className="min-w-0">
                            <h3 className="text-[13px] leading-tight font-semibold text-zinc-900">
                              {item.title}
                            </h3>
                            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="order-1 flex w-5 shrink-0 flex-col items-center lg:order-2 lg:-ml-2.5 lg:w-auto lg:flex-row"
                >
                  <span
                    className={cn(
                      "h-4 w-px shrink-0 lg:hidden",
                      index === 0 && "invisible",
                      index <= currentStage ? "bg-brand-300" : "bg-zinc-200",
                    )}
                  />
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      done && "bg-brand-600 text-white",
                      current && "bg-brand-600 ring-4 ring-brand-100",
                      future && "bg-white ring-2 ring-zinc-300",
                    )}
                  >
                    {done && <Check size={12} strokeWidth={3.5} />}
                    {current && (
                      <span className="size-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "w-px flex-1 lg:h-px lg:w-auto",
                      index === stages.length - 1
                        ? "bg-gradient-to-b from-zinc-200 to-transparent lg:bg-gradient-to-r"
                        : index < currentStage
                          ? "bg-brand-300"
                          : "bg-zinc-200",
                    )}
                  />
                </div>

                <div
                  aria-hidden="true"
                  className={cn(
                    "hidden lg:block lg:h-72 lg:flex-none",
                    above ? "lg:order-3" : "lg:order-1",
                  )}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </AppShell>
  );
}
