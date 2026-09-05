import { notFound } from "next/navigation";
import { LabShell } from "@/components/design-system/lab/lab-shell";
import { labSections, findSection } from "@/components/design-system/lab/nav";
import { sectionContent } from "@/components/design-system/lab/sections";

export function generateStaticParams() {
  // The laboratory is development only, so a production build emits no paths.
  if (process.env.NODE_ENV !== "development") return [];
  return labSections
    .filter((section) => !section.href)
    .map((section) => ({ section: section.slug }));
}

export default async function DesignSystemSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const section = findSection(slug);
  const Content = sectionContent[slug];

  if (!section || !Content) notFound();

  return (
    <LabShell
      activeSlug={section.slug}
      title={section.title}
      summary={section.summary}
      source={section.source}
      docs={section.docs}
    >
      <Content />
    </LabShell>
  );
}
