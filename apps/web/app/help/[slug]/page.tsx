import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Lightbulb } from "lucide-react";
import { ArticleToc } from "@/ui/help/article-toc";
import { helpCategoryTints, helpTopicIcons } from "@/ui/help/topic-icons";
import { AppShell } from "@/ui/shell";
import { cn } from "@/lib/cn";

import {
  adjacentHelpArticles,
  helpArticleBySlug,
  helpArticles,
  helpCategoryById,
  helpSectionId,
  relatedHelpArticles,
  type HelpArticle,
} from "@/lib/help";

type HelpArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}

function RelatedGuideCard({ article }: { article: HelpArticle }) {
  const Icon = helpTopicIcons[article.slug] ?? BookOpen;
  const tint = helpCategoryTints[article.category];
  return (
    <li>
      <Link
        href={`/help/${article.slug}`}
        className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-input hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            tint.tile,
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] leading-snug font-semibold text-foreground group-hover:text-primary">
            {article.title}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
            {article.description}
          </span>
        </span>
      </Link>
    </li>
  );
}

function AdjacentLink({
  article,
  direction,
}: {
  article: HelpArticle;
  direction: "previous" | "next";
}) {
  const next = direction === "next";
  return (
    <Link
      rel={next ? "next" : "prev"}
      href={`/help/${article.slug}`}
      className={cn(
        "group flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-input hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
        next ? "items-end text-right sm:col-start-2" : "items-start",
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {!next && (
          <ArrowLeft
            size={13}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
        )}
        {next ? "Next" : "Previous"}
        {next && (
          <ArrowRight
            size={13}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        )}
      </span>
      <span className="mt-1.5 text-[14px] font-semibold text-foreground group-hover:text-primary">
        {article.title}
      </span>
    </Link>
  );
}

export default async function HelpArticlePage({
  params,
}: HelpArticlePageProps) {
  const { slug } = await params;
  const article = helpArticleBySlug(slug);

  if (!article) notFound();

  const category = helpCategoryById(article.category);
  const tint = helpCategoryTints[article.category];
  const Icon = helpTopicIcons[article.slug] ?? BookOpen;
  const { previous, next } = adjacentHelpArticles(article.slug);
  const related = relatedHelpArticles(article.slug);
  const tocItems = article.sections.map((section) => ({
    id: helpSectionId(section.heading),
    label: section.heading,
  }));

  return (
    <AppShell currentBreadcrumbLabel={article.title}>
      <div className="mx-auto grid max-w-5xl items-start gap-10 py-2 sm:py-4 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-14">
        <article className="max-w-3xl min-w-0">
          <h1 className="sr-only">{article.title}</h1>

          <header className="flex items-start gap-4 sm:gap-5">
            <span
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-xl sm:size-14",
                tint.tile,
              )}
            >
              <Icon size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Link
                href="/help"
                className={cn(
                  "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold tracking-wide uppercase ring-1 transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  tint.chip,
                )}
              >
                {category.label}
              </Link>
              <p className="mt-2 text-lg leading-snug font-medium tracking-tight text-foreground sm:text-xl">
                {article.description}
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {article.sections.length} sections
                <span aria-hidden="true" className="mx-1.5">
                  ·
                </span>
                <Link
                  href={article.productHref}
                  className="font-medium text-primary hover:underline"
                >
                  {article.productLabel}
                </Link>
              </p>
            </div>
          </header>

          <div className="mt-10 space-y-8 sm:mt-12 sm:space-y-10">
            {article.sections.map((section, index) => {
              const id = helpSectionId(section.heading);
              return (
                <section
                  key={section.heading}
                  id={id}
                  aria-labelledby={`${id}-heading`}
                  className="grid scroll-mt-24 gap-x-5 gap-y-3 sm:grid-cols-[2.25rem_minmax(0,1fr)]"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9 place-items-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground tabular-nums shadow-xs"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2
                      id={`${id}-heading`}
                      className="text-lg leading-snug font-semibold tracking-tight text-foreground sm:pt-1.5"
                    >
                      {section.heading}
                    </h2>
                    <p className="mt-2.5 max-w-prose text-[15px] leading-7 text-muted-foreground">
                      {section.body}
                    </p>
                    {section.steps && section.steps.length > 0 ? (
                      <ol className="mt-4 space-y-2.5">
                        {section.steps.map((step, stepIndex) => (
                          <li
                            key={step}
                            className="flex gap-3 text-[15px] leading-7 text-foreground/90"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary tabular-nums"
                            >
                              {stepIndex + 1}
                            </span>
                            <span className="min-w-0">{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {section.tip ? (
                      <aside className="mt-4 flex gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
                        <Lightbulb
                          size={16}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-primary"
                        />
                        <p className="text-[14px] leading-6 text-foreground/90">
                          <span className="font-semibold text-foreground">
                            Tip{" "}
                          </span>
                          {section.tip}
                        </p>
                      </aside>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-8">
            <Button asChild variant="default">
              <Link href={article.productHref}>
                {article.productLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/help#contact">Report a problem with this guide</Link>
            </Button>
          </div>

          {related.length > 0 ? (
            <section aria-labelledby="related-guides-heading" className="mt-12">
              <h2
                id="related-guides-heading"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Related guides
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <RelatedGuideCard key={item.slug} article={item} />
                ))}
              </ul>
            </section>
          ) : null}

          {(previous || next) && (
            <nav
              aria-label="More help guides"
              className="mt-10 grid gap-3 sm:grid-cols-2"
            >
              {previous && (
                <AdjacentLink article={previous} direction="previous" />
              )}
              {next && <AdjacentLink article={next} direction="next" />}
            </nav>
          )}
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ArticleToc items={tocItems} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
