import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LabShell } from "@/components/design-system/lab/lab-shell";
import { ReuiCataloguePreviewFrame } from "@reui/catalogue-preview-frame";
import {
  findReuiCategory,
  findReuiExample,
} from "@reui/catalogue-data/catalogue.generated";

export default async function ReuiExamplePage({
  params,
}: {
  params: Promise<{ category: string; example: string }>;
}) {
  const { category: categoryName, example: exampleName } = await params;
  const category = findReuiCategory(categoryName);
  const example = findReuiExample(categoryName, exampleName);
  if (!category || !example) notFound();

  const previewUrl = `/design-system/reui/preview/${category.name}/${example.name}`;

  return (
    <LabShell
      activeSlug={`reui-catalogue-${category.name}`}
      activeHref={`/design-system/reui/${category.name}`}
      title={example.title}
      summary={`${category.label} example ${example.order} of ${category.count}.`}
      source="reui"
      docs={`https://reui.io/components/${category.name}`}
      wide
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/design-system/reui/${category.name}`}
            className="outline-focus-ring hover:bg-primary_hover flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {category.label}
          </Link>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="outline-focus-ring hover:bg-primary_hover flex min-h-11 items-center gap-2 rounded-lg border border-secondary bg-primary px-3 text-sm font-semibold text-secondary shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Open standalone
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
          <ReuiCataloguePreviewFrame
            category={category.name}
            example={example.name}
            title={example.title}
            interactive
            themeControl
            height={Math.max(Number(example.previewHeight ?? 640), 640)}
          />
        </div>

        <p className="text-quaternary font-mono text-xs">
          @reui/catalogue/{category.name}/{example.name}
        </p>
      </div>
    </LabShell>
  );
}
