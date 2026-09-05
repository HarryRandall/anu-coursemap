import { notFound } from "next/navigation";
import { findReuiExample } from "@reui/catalogue-data/catalogue.generated";
import {
  ReuiExampleRenderer,
  ReuiPreviewDocumentScope,
} from "@reui/example-renderer";

export default async function ReuiExamplePreviewPage({
  params,
}: {
  params: Promise<{ category: string; example: string }>;
}) {
  const { category, example } = await params;
  if (!findReuiExample(category, example)) notFound();

  return (
    <main className="reui-preview reui-scope style-nova flex min-h-dvh min-w-0 items-center justify-center overflow-auto bg-background p-4 text-foreground md:p-6">
      <ReuiPreviewDocumentScope />
      <ReuiExampleRenderer name={example} />
    </main>
  );
}
