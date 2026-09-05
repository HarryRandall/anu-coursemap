import { notFound } from "next/navigation";
import { findReuiCategory } from "@reui/catalogue-data/catalogue.generated";
import { LabShell } from "@/components/design-system/lab/lab-shell";
import { TabsReviewCatalogue } from "@/components/design-system/review/tabs-review-catalogue";

export default function TabsReviewPage() {
  const reuiCategory = findReuiCategory("tabs");
  if (!reuiCategory) notFound();

  return (
    <LabShell
      activeSlug="review-tabs"
      activeHref="/design-system/review/tabs"
      title="Review Tabs"
      summary="Compare every Tabs option, choose the patterns worth keeping, and leave deletion for the final cleanup."
      source="review"
      wide
    >
      <TabsReviewCatalogue reuiCategory={reuiCategory} />
    </LabShell>
  );
}
