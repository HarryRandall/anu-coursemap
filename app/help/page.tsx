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
      <div className="mx-auto max-w-6xl">
        <section className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/10">
              <HelpCircle size={21} />
            </span>
            <div>
              <p className="text-xs font-semibold text-brand-200">
                Coursemap support
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                How can we help?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Read a short guide, report incorrect data or tell us what would
                make degree planning easier.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section>
            <h2 className="text-sm font-semibold text-zinc-900">Help topics</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Short guides for the parts of Coursemap students use most.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {helpArticles.map((topic) => {
                const Icon = helpTopicIcons[topic.slug] ?? BookOpen;
                return (
                  <ButtonLink
                    key={topic.slug}
                    href={`/help/${topic.slug}`}
                    variant="secondary"
                    className="h-auto min-h-36 items-start justify-start p-4 text-left !whitespace-normal"
                  >
                    <span className="flex w-full min-w-0 flex-col items-start">
                      <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                        <Icon size={17} />
                      </span>
                      <span className="mt-3 text-[13px] font-semibold text-zinc-900">
                        {topic.title}
                      </span>
                      <span className="mt-1 block w-full text-[11px] leading-relaxed font-normal !whitespace-normal text-zinc-500">
                        {topic.description}
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                        Read guide <ArrowRight size={12} />
                      </span>
                    </span>
                  </ButtonLink>
                );
              })}
            </div>
          </section>

          <HelpContactCard />
        </div>
      </div>
    </AppShell>
  );
}
