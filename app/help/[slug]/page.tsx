import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { helpTopicIcons } from "@/components/help/topic-icons";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { helpArticleBySlug, helpArticles, otherHelpArticles } from "@/lib/help";

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
  const related = otherHelpArticles(article.slug);

  return (
    <AppShell title={article.title} subtitle="Help guide">
      <div className="mx-auto max-w-4xl">
        <ButtonLink
          href="/help"
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
        >
          <ArrowLeft size={14} /> All help topics
        </ButtonLink>

        <Card className="mt-3 overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-5 sm:px-8 sm:py-6">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={20} />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
              {article.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              {article.description}
            </p>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-8">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  {section.heading}
                </h2>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-zinc-600">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="border-t border-zinc-100 px-5 py-4 sm:px-8">
            <ButtonLink href={article.productHref} variant="primary" size="sm">
              {article.productLabel} <ArrowRight size={14} />
            </ButtonLink>
          </div>
        </Card>

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Other help topics
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {related.map((item) => {
              const RelatedIcon = helpTopicIcons[item.slug] ?? BookOpen;
              return (
                <ButtonLink
                  key={item.slug}
                  href={`/help/${item.slug}`}
                  variant="secondary"
                  className="h-auto min-h-24 items-start justify-start p-4 text-left !whitespace-normal"
                >
                  <span className="flex w-full min-w-0 flex-col items-start">
                    <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <RelatedIcon size={15} />
                    </span>
                    <span className="mt-2 text-[13px] font-semibold text-zinc-900">
                      {item.title}
                    </span>
                    <span className="mt-1 block w-full text-[11px] leading-relaxed font-normal !whitespace-normal text-zinc-500">
                      {item.description}
                    </span>
                  </span>
                </ButtonLink>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
