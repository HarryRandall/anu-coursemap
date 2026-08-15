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
      <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-6 lg:gap-8">
        <section className="rounded-2xl bg-zinc-900 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
          <div className="flex max-w-3xl items-start gap-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/10">
              <HelpCircle size={28} />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-200">
                Coursemap support
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                How can we help?
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300">
                Read a short guide, report incorrect data or tell us what would
                make degree planning easier.
              </p>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <section
            aria-label="Help guides"
            className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2"
          >
            {helpArticles.map((topic) => {
              const Icon = helpTopicIcons[topic.slug] ?? BookOpen;
              return (
                <ButtonLink
                  key={topic.slug}
                  href={`/help/${topic.slug}`}
                  variant="secondary"
                  className="!h-full min-h-44 !items-stretch justify-start p-5 text-left !whitespace-normal sm:min-h-0 sm:p-6"
                >
                  <span className="flex h-full w-full min-w-0 flex-col items-start">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon size={20} />
                    </span>
                    <span className="mt-4 text-base font-semibold tracking-tight text-zinc-900">
                      {topic.title}
                    </span>
                    <span className="mt-1.5 block w-full text-sm leading-relaxed font-normal !whitespace-normal text-zinc-500">
                      {topic.description}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-brand-700">
                      Read guide <ArrowRight size={14} />
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
