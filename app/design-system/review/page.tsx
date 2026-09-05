import { LabShell } from "@/components/design-system/lab/lab-shell";
import { ComponentReviewSummary } from "@/components/design-system/review/review-summary";

export default function ComponentReviewSummaryPage() {
  return (
    <LabShell
      activeSlug="component-review"
      activeHref="/design-system/review"
      title="Review summary"
      summary="Your saved component decisions, ready for the final dependency-checked cleanup."
      source="review"
    >
      <ComponentReviewSummary />
    </LabShell>
  );
}
