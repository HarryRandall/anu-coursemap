import { notFound } from "next/navigation";
import { findSection } from "@/components/design-system/lab/nav";
import { sectionContent } from "@/components/design-system/lab/sections";
import { findComponentReviewFamily } from "@/components/design-system/review/review-families";
import { ReviewSectionScope } from "@/components/design-system/review/review-section-scope";
import type { ComponentReviewSource } from "@/components/design-system/review/review-types";

function reviewSourceForLabSection(
  source: "mit" | "adapted" | "tokens",
): ComponentReviewSource {
  return source === "mit" ? "untitled" : "coursemap";
}

export default async function LabReviewExamplePreviewPage({
  params,
}: {
  params: Promise<{ family: string; section: string; example: string }>;
}) {
  const { family: familySlug, section: sectionSlug, example } = await params;
  const targetId = decodeURIComponent(example);
  const family = findComponentReviewFamily(familySlug);
  const section = findSection(sectionSlug);
  const Content = sectionContent[sectionSlug];

  if (
    !family ||
    !family.labSections.includes(sectionSlug) ||
    !section ||
    !Content ||
    section.source === "review" ||
    section.source === "reui"
  ) {
    notFound();
  }

  return (
    <main className="catalogue-preview flex min-h-dvh min-w-0 items-center justify-center overflow-auto bg-primary p-4 text-primary md:p-6">
      <div className="w-full max-w-[1440px]">
        <ReviewSectionScope
          family={family.slug}
          section={section.slug}
          source={reviewSourceForLabSection(section.source)}
          mode="preview"
          targetId={targetId}
        >
          <Content />
        </ReviewSectionScope>
      </div>
    </main>
  );
}
