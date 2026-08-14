import { BookOpen, GitBranch, Map, ShieldCheck } from "lucide-react";

const capabilities = [
  {
    icon: BookOpen,
    title: "Works from the ANU catalogue",
    description:
      "Course pages, offerings and prerequisite text stay tied to a catalogue year, with provenance you can inspect.",
  },
  {
    icon: GitBranch,
    title: "A graph you can actually follow",
    description:
      "Explore what a course needs and what it unlocks, with the same status available as text beside the diagram.",
  },
  {
    icon: Map,
    title: "Plans that survive the next semester",
    description:
      "Completed, planned and blocked courses live in one board, so you can adjust load before enrolment week.",
  },
  {
    icon: ShieldCheck,
    title: "Independent, not official enrolment",
    description:
      "Coursemap helps you prepare. It does not replace Programs and Courses, ISIS or academic advice.",
  },
] as const;

export function LandingCapabilities() {
  return (
    <section className="border-t border-zinc-200 bg-zinc-50/80">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            More like a map than a handbook
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            The product is built for the slow questions students actually ask:
            what can I take, what does it unlock, and will this plan still hold.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-zinc-200/80"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
