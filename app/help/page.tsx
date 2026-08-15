import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { HelpContactCard } from "@/components/help/help-contact-card";
import { helpTopicIcons } from "@/components/help/topic-icons";
import { AppShell } from "@/components/shell";
import { helpArticles } from "@/lib/help";

export default function HelpPage() {
  return (
    <AppShell
      title="Help & support"
      subtitle="Answers, corrections and feedback"
    >
      <div className="mx-auto max-w-7xl">
        <header className="max-w-2xl px-1 pt-2 pb-8 sm:pt-4 sm:pb-10">
          <p className="text-[13px] font-semibold tracking-wide text-brand-700 uppercase">
            Coursemap support
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            How can we help?
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Read a short guide, report incorrect data or tell us what would make
            degree planning easier.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            aria-label="Help guides"
            className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {helpArticles.map((topic) => {
              const Icon = helpTopicIcons[topic.slug] ?? BookOpen;
              return (
                <Link
                  key={topic.slug}
                  href={`/help/${topic.slug}`}
                  className="group flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70 transition hover:shadow-md hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                    <Icon size={17} />
                  </span>
                  <h2 className="mt-3 text-[15px] leading-snug font-semibold tracking-tight text-zinc-900">
                    {topic.title}
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                    {topic.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold text-brand-700">
                    Read guide
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </Link>
              );
            })}
          </section>

          <HelpContactCard />
        </div>
      </div>
    </AppShell>
  );
}
