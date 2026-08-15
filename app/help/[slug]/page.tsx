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
        <ButtonLink href="/help" variant="ghost" className="-ml-2 w-fit">
          <ArrowLeft size={16} /> All help topics
        </ButtonLink>

        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-zinc-100 px-6 py-6 sm:px-8 sm:py-8">
            <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={22} />
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900">
              {article.title}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-500">
              {article.description}
            </p>
          </div>

          <div className="space-y-8 px-6 py-7 sm:px-8">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  {section.heading}
                </h2>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="border-t border-zinc-100 px-6 py-5 sm:px-8">
            <ButtonLink href={article.productHref} variant="primary">
              {article.productLabel} <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </Card>

        <section className="mt-6">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Other help topics
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((item) => {
              const RelatedIcon = helpTopicIcons[item.slug] ?? BookOpen;
              return (
                <ButtonLink
                  key={item.slug}
                  href={`/help/${item.slug}`}
                  variant="secondary"
                  className="h-auto min-h-32 items-start justify-start p-5 text-left !whitespace-normal"
                >
                  <span className="flex w-full min-w-0 flex-col items-start">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <RelatedIcon size={18} />
                    </span>
                    <span className="mt-3 text-sm font-semibold text-zinc-900">
                      {item.title}
                    </span>
                    <span className="mt-1 block w-full text-sm leading-relaxed font-normal !whitespace-normal text-zinc-500">
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
