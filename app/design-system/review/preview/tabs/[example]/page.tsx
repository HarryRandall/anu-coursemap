import { notFound } from "next/navigation";
import { findUntitledTabsReviewItem } from "@/components/design-system/review/tabs-review-data";
import { UntitledTabsReviewExample } from "@/components/design-system/review/untitled-tabs-review-example";

export default async function UntitledTabsReviewPreviewPage({
  params,
}: {
  params: Promise<{ example: string }>;
}) {
  const { example } = await params;
  const item = findUntitledTabsReviewItem(`untitled:tabs:${example}`);
  if (!item) notFound();

  return (
    <main className="catalogue-preview flex min-h-dvh items-center justify-center bg-primary p-6 md:p-10">
      <div className="flex w-full max-w-4xl justify-center">
        <UntitledTabsReviewExample example={item.id} />
      </div>
    </main>
  );
}
