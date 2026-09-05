import { notFound } from "next/navigation";
import { LabShell } from "@/components/design-system/lab/lab-shell";
import { ReuiCategoryGallery } from "@reui/category-gallery";
import { findReuiCategory } from "@reui/catalogue-data/catalogue.generated";

export default async function ReuiCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categoryName } = await params;
  const category = findReuiCategory(categoryName);
  if (!category) notFound();

  return (
    <LabShell
      activeSlug={`reui-catalogue-${category.name}`}
      activeHref={`/design-system/reui/${category.name}`}
      title={category.label}
      summary={`${category.count} free ReUI examples. ${category.description}`}
      source="reui"
      docs={`https://reui.io/components/${category.name}`}
      wide
    >
      <ReuiCategoryGallery category={category} />
    </LabShell>
  );
}
