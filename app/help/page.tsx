import { ArrowRight, BookOpen, HelpCircle } from "lucide-react";
import { HelpContactCard } from "@/components/help/help-contact-card";
import { helpTopicIcons } from "@/components/help/topic-icons";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { helpArticles } from "@/lib/help";

export default function HelpPage() {
  return (
    <AppShell
      title="Help & support"
      subtitle="Answers, corrections and feedback"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] max-w-7xl flex-col gap-5">
        <section className="rounded-2xl bg-zinc-900 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-9">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/10">
              <HelpCircle size={24} />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand-200 uppercase">
                Coursemap support
              </p>
              <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
                How can we help?
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
                Read a short guide, report incorrect data or tell us what would
                make degree planning easier.
              </p>
            </div>
          </div>
        </section>

        <div className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            aria-label="Help guides"
            className="grid h-full auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {helpArticles.map((topic) => {
              const Icon = helpTopicIcons[topic.slug] ?? BookOpen;
              return (
                <ButtonLink
                  key={topic.slug}
                  href={`/help/${topic.slug}`}
                  variant="secondary"
                  className="group !h-full min-h-44 !items-stretch justify-start p-5 text-left !whitespace-normal sm:p-6"
                >
                  <span className="flex h-full w-full min-w-0 flex-col items-start">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                      <Icon size={19} />
                    </span>
                    <span className="mt-3.5 text-[15px] leading-snug font-semibold tracking-tight text-zinc-900">
                      {topic.title}
                    </span>
                    <span className="mt-1.5 block w-full text-[13px] leading-relaxed font-normal !whitespace-normal text-zinc-500">
                      {topic.description}
                    </span>
                    <span className="mt-4 flex w-full flex-col gap-2 border-t border-zinc-100 pt-4">
                      {topic.sections.map((section) => (
                        <span
                          key={section.heading}
                          className="flex w-full min-w-0 items-start gap-2 text-[12px] leading-relaxed font-normal !whitespace-normal text-zinc-500"
                        >
                          <span
                            aria-hidden
                            className="mt-1.5 size-1 shrink-0 rounded-full bg-zinc-300"
                          />
                          {section.heading}
                        </span>
                      ))}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold text-brand-700">
                      Read guide
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </span>
                </ButtonLink>
              );
            })}
          </section>

          <HelpContactCard />
        </div>
      </div>
    </AppShell>
  );
}
