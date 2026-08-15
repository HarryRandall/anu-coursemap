import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { ArticleToc } from "@/components/help/article-toc";
import { helpTopicIcons } from "@/components/help/topic-icons";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
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

  const Icon = helpTopicIcons[article.slug] ?? BookOpen;
  const { previous, next } = adjacentHelpArticles(article.slug);
  const tocItems = article.sections.map((section) => ({
    id: helpSectionId(section.heading),
    label: section.heading,
  }));

  return (
    <AppShell title={article.title} subtitle="Help guide">
      <div className="mx-auto grid max-w-5xl items-start gap-8 px-1 py-2 sm:py-6 md:grid-cols-[minmax(0,1fr)_11rem] lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-10">
        <article className="max-w-3xl min-w-0">
          <header>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={21} />
              </span>
              <p className="text-[13px] font-semibold tracking-wide text-brand-700 uppercase">
                Help guide
              </p>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-zinc-600">
              {article.description}
            </p>
          </header>

          <div className="mt-10 space-y-10 border-t border-zinc-200 pt-10">
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
          </div>

          <div className="mt-10">
            <ButtonLink href={article.productHref} variant="primary">
              {article.productLabel} <ArrowRight size={16} />
            </ButtonLink>
          </div>

          {(previous || next) && (
            <nav
              aria-label="More help guides"
              className="mt-14 grid gap-4 border-t border-zinc-200 pt-8 sm:grid-cols-2 md:hidden"
            >
              {previous && (
                <Link
                  rel="prev"
                  href={`/help/${previous.slug}`}
                  className="group flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/70 transition hover:shadow-md hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    <ArrowLeft
                      size={13}
                      className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
                    />
                    Previous
                  </span>
                  <span className="mt-2 text-sm font-semibold tracking-tight text-zinc-900">
                    {previous.title}
                  </span>
                  <span className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                    {previous.description}
                  </span>
                </Link>
              )}
              {next && (
                <Link
                  rel="next"
                  href={`/help/${next.slug}`}
                  className="group flex flex-col rounded-2xl bg-white p-5 text-right shadow-sm ring-1 ring-zinc-200/70 transition hover:shadow-md hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 sm:col-start-2"
                >
                  <span className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Next
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="mt-2 text-sm font-semibold tracking-tight text-zinc-900">
                    {next.title}
                  </span>
                  <span className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                    {next.description}
                  </span>
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
                    className="group block rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70 transition hover:shadow-md hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  >
                    <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Up next
                    </span>
                    <span className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug font-semibold text-zinc-900 transition-colors group-hover:text-brand-700">
                      {next.title}
                      <ArrowRight
                        size={13}
                        className="mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </span>
                  </Link>
                )}
                {previous && (
                  <Link
                    rel="prev"
                    href={`/help/${previous.slug}`}
                    className="group block rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70 transition hover:shadow-md hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  >
                    <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      Previous
                    </span>
                    <span className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug font-semibold text-zinc-900 transition-colors group-hover:text-brand-700">
                      <ArrowLeft
                        size={13}
                        className="mt-0.5 shrink-0 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
                      />
                      {previous.title}
                    </span>
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
