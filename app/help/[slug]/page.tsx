import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ArticleToc } from "@/components/help/article-toc";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  adjacentHelpArticles,
  helpArticleBySlug,
  helpArticles,
  helpSectionId,
} from "@/lib/help";

type HelpArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}

export default async function HelpArticlePage({
  params,
}: HelpArticlePageProps) {
  const { slug } = await params;
  const article = helpArticleBySlug(slug);

  if (!article) notFound();

  const { previous, next } = adjacentHelpArticles(article.slug);
  const tocItems = article.sections.map((section) => ({
    id: helpSectionId(section.heading),
    label: section.heading,
  }));

  return (
    <AppShell>
      <div className="mx-auto grid max-w-5xl items-start gap-8 px-1 py-2 sm:py-6 md:grid-cols-[minmax(0,1fr)_11rem] lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-10">
        <article className="max-w-3xl min-w-0">
          <h1 className="sr-only">{article.title}</h1>
          <Card>
            <CardContent className="space-y-10 pt-5 sm:pt-6">
              {article.sections.map((section) => (
                <section
                  key={section.heading}
                  id={helpSectionId(section.heading)}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                    {section.heading}
                  </h2>
                  <p className="mt-3 max-w-prose text-base leading-7 text-zinc-600">
                    {section.body}
                  </p>
                </section>
              ))}
            </CardContent>
            <CardFooter className="justify-start">
              <ButtonLink href={article.productHref} variant="primary">
                {article.productLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
            </CardFooter>
          </Card>

          {(previous || next) && (
            <nav
              aria-label="More help guides"
              className="mt-14 grid gap-4 border-t border-zinc-200 pt-8 sm:grid-cols-2 md:hidden"
            >
              {previous && (
                <Link
                  rel="prev"
                  href={`/help/${previous.slug}`}
                  className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <Card className="h-full transition group-hover:border-zinc-300 group-hover:shadow-sm motion-reduce:transition-none">
                    <CardHeader className="h-full flex-col items-start justify-start gap-0">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        <ArrowLeft
                          size={13}
                          aria-hidden="true"
                          className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
                        />
                        Previous
                      </span>
                      <h2 className="mt-2 text-sm font-semibold tracking-tight text-zinc-900">
                        {previous.title}
                      </h2>
                      <span className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                        {previous.description}
                      </span>
                    </CardHeader>
                  </Card>
                </Link>
              )}
              {next && (
                <Link
                  rel="next"
                  href={`/help/${next.slug}`}
                  className="group block h-full rounded-xl text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:col-start-2"
                >
                  <Card className="h-full transition group-hover:border-zinc-300 group-hover:shadow-sm motion-reduce:transition-none">
                    <CardHeader className="h-full flex-col items-end justify-start gap-0">
                      <span className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        Next
                        <ArrowRight
                          size={13}
                          aria-hidden="true"
                          className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </span>
                      <h2 className="mt-2 text-sm font-semibold tracking-tight text-zinc-900">
                        {next.title}
                      </h2>
                      <span className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                        {next.description}
                      </span>
                    </CardHeader>
                  </Card>
                </Link>
              )}
            </nav>
          )}
        </article>

        <aside className="hidden md:block">
          <div className="sticky top-24 space-y-5">
            <ArticleToc items={tocItems} />
            {(previous || next) && (
              <nav
                aria-label="More help guides"
                className="space-y-3 border-t border-zinc-200 pt-5"
              >
                {next && (
                  <Link
                    rel="next"
                    href={`/help/${next.slug}`}
                    className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  >
                    <Card className="transition group-hover:border-zinc-300 group-hover:shadow-sm motion-reduce:transition-none">
                      <CardHeader className="flex-col items-start justify-start gap-0 p-4">
                        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                          Up next
                        </span>
                        <h2 className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug font-semibold text-zinc-900 transition-colors group-hover:text-brand-700">
                          {next.title}
                          <ArrowRight
                            size={13}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                          />
                        </h2>
                      </CardHeader>
                    </Card>
                  </Link>
                )}
                {previous && (
                  <Link
                    rel="prev"
                    href={`/help/${previous.slug}`}
                    className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  >
                    <Card className="transition group-hover:border-zinc-300 group-hover:shadow-sm motion-reduce:transition-none">
                      <CardHeader className="flex-col items-start justify-start gap-0 p-4">
                        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                          Previous
                        </span>
                        <h2 className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug font-semibold text-zinc-900 transition-colors group-hover:text-brand-700">
                          <ArrowLeft
                            size={13}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
                          />
                          {previous.title}
                        </h2>
                      </CardHeader>
                    </Card>
                  </Link>
                )}
              </nav>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
