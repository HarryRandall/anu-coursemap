import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@reui/ui/card";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { HelpContactCard } from "@/components/help/help-contact-card";
import { helpTopicIcons } from "@/components/help/topic-icons";
import { AppShell } from "@/components/shell";

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
                  className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Card className="flex h-full flex-col overflow-hidden transition group-hover:border-input group-hover:shadow-sm motion-reduce:transition-none">
                    <CardHeader className="flex-1">
                      {
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/15 motion-reduce:transition-none">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                      }
                      <CardTitle>
                        <h2>{topic.title}</h2>
                      </CardTitle>
                      {Boolean(topic.description) && (
                        <CardDescription>{topic.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="text-[13px] font-semibold text-primary">
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
