import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { HelpContactCard } from "@/components/help/help-contact-card";
import { helpTopicIcons } from "@/components/help/topic-icons";
import { AppShell } from "@/components/shell";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { helpArticles } from "@/lib/help";

export default function HelpPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <h1 className="sr-only">Help and support</h1>

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
                  className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <Card className="flex h-full flex-col overflow-hidden transition group-hover:border-zinc-300 group-hover:shadow-sm motion-reduce:transition-none">
                    <CardHeader
                      className="flex-1"
                      icon={
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100 motion-reduce:transition-none">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                      }
                      title={topic.title}
                      description={topic.description}
                    />
                    <CardFooter className="text-[13px] font-semibold text-brand-700">
                      <span className="inline-flex items-center gap-1.5">
                        Read guide
                        <ArrowRight
                          size={14}
                          aria-hidden="true"
                          className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </span>
                    </CardFooter>
                  </Card>
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
