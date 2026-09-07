import { CircleHelp, icons, type LucideProps } from "lucide-react";

type IconPlaceholderProps = LucideProps & {
  lucide: string;
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
};

const legacyNames: Record<string, keyof typeof icons> = {
  Loader2: "LoaderCircle",
  MoreHorizontal: "Ellipsis",
};

/**
 * ReUI's source supports several selectable icon libraries. Coursemap already
 * uses Lucide, so the vendored components resolve the supplied Lucide name and
 * retain the upstream prop shape without adding four redundant icon packages.
 */
export function IconPlaceholder({
  lucide,
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...props
}: IconPlaceholderProps) {
  void _tabler;
  void _hugeicons;
  void _phosphor;
  void _remixicon;

  const requestedName = lucide.replace(/Icon$/, "");
  const resolvedName = legacyNames[requestedName] ?? requestedName;
  const Icon = icons[resolvedName as keyof typeof icons] ?? CircleHelp;

  return <Icon aria-hidden="true" {...props} />;
}
