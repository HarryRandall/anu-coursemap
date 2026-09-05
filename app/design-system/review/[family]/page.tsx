import { notFound } from "next/navigation";
import { findReuiCategory } from "@reui/catalogue-data/catalogue.generated";
import { LabShell } from "@/components/design-system/lab/lab-shell";
import { findSection } from "@/components/design-system/lab/nav";
import { sectionContent } from "@/components/design-system/lab/sections";
import { ReviewFamilyCatalogue } from "@/components/design-system/review/review-family-catalogue";
import {
  componentReviewFamilies,
  findComponentReviewFamily,
} from "@/components/design-system/review/review-families";
import { ReviewSectionScope } from "@/components/design-system/review/review-section-scope";
import type { ComponentReviewSource } from "@/components/design-system/review/review-types";

export function generateStaticParams() {
  if (process.env.NODE_ENV !== "development") return [];
  return componentReviewFamilies.map((family) => ({ family: family.slug }));
}

function reviewSourceForLabSection(
  source: "mit" | "adapted" | "tokens",
): ComponentReviewSource {
  return source === "mit" ? "untitled" : "coursemap";
}

export default async function ComponentReviewFamilyPage({
  params,
}: {
  params: Promise<{ family: string }>;
}) {
  const { family: familySlug } = await params;
  const family = findComponentReviewFamily(familySlug);
  if (!family) notFound();

  const categories = family.reuiCategories
    .map((category) => findReuiCategory(category))
    .filter((category) => category !== undefined);

  return (
    <LabShell
      activeSlug={`review-${family.slug}`}
      activeHref={`/design-system/review/${family.slug}`}
      title={`Review ${family.title}`}
      summary={`${family.summary} Mark each option as Preferred, Keep or Remove.`}
      source="review"
      wide
    >
      <ReviewFamilyCatalogue family={family.slug} categories={categories}>
        {family.labSections.map((sectionSlug) => {
          const section = findSection(sectionSlug);
          const Content = sectionContent[sectionSlug];
          if (
            !section ||
            !Content ||
            section.source === "review" ||
            section.source === "reui"
          ) {
            return null;
          }
          const source = reviewSourceForLabSection(section.source);
          return (
            <section key={section.slug} className="flex flex-col gap-5">
              <div className="border-b border-secondary pb-3">
                <p className="text-xs font-semibold tracking-wide text-brand-secondary uppercase">
                  {source === "untitled" ? "Untitled UI" : "Coursemap"}
                </p>
                <h2 className="text-display-xs font-semibold text-primary">
                  {section.title}
                </h2>
              </div>
              <ReviewSectionScope
                family={family.slug}
                section={section.slug}
                source={source}
                mode="catalogue"
              >
                <Content />
              </ReviewSectionScope>
            </section>
          );
        })}
      </ReviewFamilyCatalogue>
    </LabShell>
  );
}
