import Link from "next/link";
import { Check } from "lucide-react";
import { RoadmapCarousel } from "@/components/roadmap/roadmap-carousel";
import { cn } from "@/lib/cn";
import { roadmapItems, roadmapStages, type RoadmapStage } from "@/lib/roadmap";

const wavePath =
  "M0 150 C80 150 90 72 150 72 S220 150 300 150 S390 72 450 72 S520 150 600 150 S690 72 750 72 S820 150 900 150 S990 72 1050 72 S1120 150 1200 150";

export function RoadmapBoard({ stage }: { stage: RoadmapStage }) {
  return (
    <section
      aria-label="Product roadmap"
      className="roadmap-panel relative overflow-hidden rounded-[28px] text-white shadow-[0_24px_80px_rgb(76_29_149_/_0.28)] ring-1 ring-[#f0c14b]/25"
    >
      <RoadmapDecor />
      <RoadmapCarousel>
        <div className="relative z-10 min-w-[64rem] px-8 pt-10 pb-6 sm:px-12 lg:min-w-0">
          <ol className="grid grid-cols-4">
            {roadmapStages.map((item) => {
              const active = item.id === stage;
              return (
                <li
                  key={item.id}
                  id={`roadmap-${item.id}`}
                  className="px-3 sm:px-4"
                >
                  <h2 className="font-semibold tracking-tight text-[#f0c14b] sm:text-lg">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-[11px] text-white/50">
                    {item.description}
                  </p>
                  <ul
                    className={cn(
                      "mt-4 space-y-2.5 text-[13px] leading-relaxed",
                      active ? "text-white/90" : "text-white/45",
                    )}
                  >
                    {roadmapItems[item.id].map((entry) => (
                      <li key={entry.id} className="flex gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1 shrink-0 rounded-full bg-[#f0c14b]"
                        />
                        <span>
                          <span className="font-medium">{entry.title}</span>
                          {entry.progress != null ? (
                            <span className="text-white/55">
                              {" "}
                              · {entry.progress}%
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
          <div className="relative mt-6 h-36">
            <RoadmapWave />
            {roadmapStages.map((item, index) => {
              const active = item.id === stage;
              const shipped = item.id === "shipped";
              return (
                <div
                  key={item.id}
                  className="absolute top-0 flex h-[33%] -translate-x-1/2 flex-col items-center"
                  style={{ left: `${12.5 + index * 25}%` }}
                >
                  <span
                    aria-hidden="true"
                    className="w-px flex-1 bg-linear-to-b from-[#f0c14b]/0 to-[#f0c14b]"
                  />
                  <span
                    className={cn(
                      "relative z-10 grid size-5 place-items-center rounded-full bg-white",
                      active && "size-6 shadow-[0_0_22px_rgb(244_63_94_/_0.9)]",
                    )}
                  >
                    {shipped ? (
                      <Check
                        size={11}
                        strokeWidth={3}
                        className="text-rose-600"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="sr-only">
                      {item.title}
                      {shipped ? ", completed" : ""}
                      {active ? ", current focus" : ""}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </RoadmapCarousel>
      <nav
        aria-label="Roadmap stages"
        className="relative z-10 flex justify-center gap-6 px-4 pt-1 pb-6"
      >
        {roadmapStages.map((item) => {
          const active = item.id === stage;
          return (
            <Link
              key={item.id}
              href={`/roadmap?stage=${item.id}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-11 px-1 text-sm tracking-wide transition",
                active
                  ? "border-b-2 border-white font-semibold text-white"
                  : "border-b-2 border-transparent text-white/45 hover:text-white/80",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

function RoadmapWave() {
  return (
    <svg
      viewBox="0 0 1200 220"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="roadmap-wave" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="42%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="roadmap-wave-soft" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fdba74" />
        </linearGradient>
      </defs>
      <path
        d={`${wavePath} L1200 220 L0 220 Z`}
        fill="url(#roadmap-wave-soft)"
        opacity="0.22"
      />
      <path
        d={wavePath}
        fill="none"
        stroke="url(#roadmap-wave)"
        strokeLinecap="round"
        strokeWidth="34"
        opacity="0.38"
      />
      <path
        d={wavePath}
        fill="none"
        stroke="url(#roadmap-wave)"
        strokeLinecap="round"
        strokeWidth="20"
      />
      <path
        d={wavePath}
        fill="none"
        stroke="#f0c14b"
        strokeLinecap="round"
        strokeWidth="3"
        opacity="0.7"
        transform="translate(0 -11)"
      />
    </svg>
  );
}

function RoadmapDecor() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      viewBox="0 0 1200 640"
      preserveAspectRatio="xMidYMid slice"
    >
      <polygon points="90,40 170,110 40,150" fill="#9f1239" opacity="0.18" />
      <polygon
        points="1080,80 1180,40 1160,180"
        fill="#9f1239"
        opacity="0.16"
      />
      <polygon
        points="980,520 1120,470 1100,610"
        fill="#6b21a8"
        opacity="0.2"
      />
      <polygon points="80,480 180,430 140,580" fill="#9f1239" opacity="0.12" />
    </svg>
  );
}
