import { notFound } from "next/navigation";
import { ShellPreview } from "@/components/design-system/lab/shell-previews";
import { shellIds, type ShellId } from "@/components/design-system/lab/shells";

export function generateStaticParams() {
  // The laboratory is development only, so a production build emits no paths.
  if (process.env.NODE_ENV !== "development") return [];
  return shellIds.map((shell) => ({ shell }));
}

export default async function ShellPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ shell: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { shell } = await params;
  const { theme } = await searchParams;

  if (!shellIds.includes(shell as ShellId)) notFound();

  return <ShellPreview shell={shell as ShellId} theme={theme} />;
}
