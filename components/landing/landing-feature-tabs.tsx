"use client";

import Image from "next/image";
import {
  GitBranch,
  ListChecks,
  ListFilter,
  Map,
  Search,
  UnfoldHorizontal,
} from "lucide-react";
import {
  CoursesOverlay,
  PlanOverlay,
  PrerequisitesOverlay,
} from "@/components/landing/landing-overlays";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const scenes = [
  {
    id: "courses",
    label: "Courses",
    title: "Find the right courses",
    image: "/landing/library.jpg",
    imageAlt: "Students studying in a bright university library",
    overlay: CoursesOverlay,
    features: [
      {
        icon: Search,
        title: "Search by code, name or convener",
        description:
          "Start from a course code or a topic and scan the versioned ANU catalogue without leaving the page.",
      },
      {
        icon: ListFilter,
        title: "Filter by subject, level and session",
        description:
          "Narrow the list to what you can actually take this year, including offering session and teaching school.",
      },
      {
        icon: UnfoldHorizontal,
        title: "See what a course counts towards",
        description:
          "Each result shows units, delivery and the requirements it can satisfy, so you can compare options quickly.",
      },
    ],
  },
  {
    id: "prerequisites",
    label: "Prerequisites",
    title: "Follow prerequisite paths",
    image: "/landing/campus.jpg",
    imageAlt: "A tree-lined university campus path on a clear day",
    overlay: PrerequisitesOverlay,
    features: [
      {
        icon: ListChecks,
        title: "Read the rule in plain language",
        description:
          "The catalogue text stays visible, so you can check the official wording against the structured path.",
      },
      {
        icon: GitBranch,
        title: "Walk the chain that unlocks the next course",
        description:
          "See what sits before COMP2100, what it opens later, and which steps are still missing.",
      },
      {
        icon: Search,
        title: "Pair the graph with a text status",
        description:
          "Completed, planned, blocked and approval needed are labelled in words, not colour alone.",
      },
    ],
  },
  {
    id: "plan",
    label: "Degree plan",
    title: "Build a degree plan",
    image: "/landing/planning.jpg",
    imageAlt: "Students planning a semester with notebooks at a cafe table",
    overlay: PlanOverlay,
    features: [
      {
        icon: Map,
        title: "Arrange courses by study period",
        description:
          "Place offerings into future semesters and keep completed attempts separate from what is still ahead.",
      },
      {
        icon: ListChecks,
        title: "Spot unit and requirement gaps early",
        description:
          "See load, missing prerequisites and approval notes while there is still time to change the plan.",
      },
      {
        icon: GitBranch,
        title: "Keep the path attached to the plan",
        description:
          "Selecting a course still opens its prerequisite chain, so planning never loses the catalogue context.",
      },
    ],
  },
] as const;

export function LandingFeatureTabs() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          Give Coursemap the question. Get a path you can follow.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
          Search the catalogue, walk the prerequisite chain, then place courses
          into a plan you can explain.
        </p>
      </div>

      <Tabs defaultValue="courses" className="mt-10 gap-8">
        <TabsList
          aria-label="Coursemap product areas"
          className="mx-auto min-h-[3.25rem] w-full max-w-xl rounded-full p-1 shadow-xs ring-1 ring-zinc-200/80"
        >
          {scenes.map((scene) => (
            <TabsTrigger
              key={scene.id}
              value={scene.id}
              className="min-h-11 rounded-full px-3 text-[13px] font-semibold sm:px-4"
            >
              {scene.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {scenes.map((scene) => {
          const Overlay = scene.overlay;
          return (
            <TabsContent key={scene.id} value={scene.id} className="mt-2">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className="relative min-h-[22rem] w-full overflow-hidden rounded-[2rem] shadow-md sm:min-h-[28rem] lg:min-h-[32rem]">
                  <Image
                    src={scene.image}
                    alt={scene.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 36rem, 100vw"
                    className="object-cover"
                    priority={scene.id === "courses"}
                  />
                  <div className="absolute inset-x-3 bottom-3 sm:right-6 sm:bottom-6 sm:left-6">
                    <Overlay />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                    {scene.title}
                  </h3>
                  <ul className="mt-6">
                    {scene.features.map(
                      ({ icon: Icon, title, description }) => (
                        <li
                          key={title}
                          className="flex gap-4 border-b border-zinc-200 py-5 first:pt-0 last:border-b-0"
                        >
                          <span className="mt-0.5 grid size-10 shrink-0 place-items-center text-zinc-700">
                            <Icon className="size-5" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-[15px] font-semibold text-zinc-900">
                              {title}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                              {description}
                            </p>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
