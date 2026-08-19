"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type RoadmapStage = {
  title: string;
  description: string;
  items: Array<{ title: string; description: string }>;
};

type RoadmapTimelineProps = {
  stages: RoadmapStage[];
  currentStage: number;
};

export function RoadmapTimeline({
  stages,
  currentStage,
}: RoadmapTimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: "back" | "forward") => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollBy({
      left: (direction === "forward" ? 1 : -1) * viewport.clientWidth * 0.72,
      behavior: "smooth",
    });
  };

  return (
    <section aria-label="Coursemap roadmap" className="h-full w-full">
      <div className="relative h-full before:absolute before:top-1/2 before:right-0 before:left-0 before:h-px before:bg-zinc-200">
        <div
          ref={viewportRef}
          tabIndex={0}
          aria-label="Coursemap roadmap timeline"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollByPage("back");
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollByPage("forward");
            }
          }}
          className="h-full overflow-x-auto overscroll-x-contain scroll-smooth pb-5 outline-none"
        >
          <ol className="relative flex h-full w-max min-w-full px-4 sm:px-6">
            {stages.map((stage, index) => {
              const above = index % 2 === 0;
              const done = index < currentStage;
              const current = index === currentStage;
              const future = index > currentStage;

              return (
                <li
                  key={stage.title}
                  aria-current={current ? "step" : undefined}
                  className="relative z-10 flex h-full w-80 shrink-0 snap-center flex-col"
                >
                  <article
                    className={cn(
                      "flex h-[calc(50%-1.25rem)] flex-col border-l-2 px-6",
                      above ? "order-1 justify-end pb-8" : "order-3 pt-8",
                      current && "border-brand-400",
                      done && "border-brand-200",
                      future && "border-zinc-200",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "text-[10px] font-semibold tracking-[0.2em]",
                        future ? "text-zinc-300" : "text-brand-400",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-zinc-900">
                      {stage.title}
                      {current && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-brand-700 uppercase ring-1 ring-brand-200">
                          In progress
                        </span>
                      )}
                      {future && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-zinc-500 uppercase ring-1 ring-zinc-200">
                          Planned
                        </span>
                      )}
                    </h3>
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
                            <h4 className="text-[13px] leading-tight font-semibold text-zinc-900">
                              {item.title}
                            </h4>
                            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <div
                    aria-hidden="true"
                    className="order-2 -ml-2.5 flex h-10 items-center"
                  >
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
                  </div>

                  <div
                    aria-hidden="true"
                    className={cn(
                      "h-[calc(50%-1.25rem)]",
                      above ? "order-3" : "order-1",
                    )}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
