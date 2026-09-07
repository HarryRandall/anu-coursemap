import { ErrorState } from "@/ui/common/error-state";
import { ImportEmptyArtwork } from "./import-empty-artwork";
import type { ImportEmptyKind } from "./import-empty-artwork";

const content: Record<ImportEmptyKind, { title: string; description: string }> =
  {
    database: {
      title: "No database rows yet",
      description:
        "Rows appear once this import produces a database projection or saves a snapshot.",
    },
    source: {
      title: "No source artefacts yet",
      description:
        "Source pages and extraction files appear as the import progresses.",
    },
    preview: {
      title: "No preview yet",
      description: "A preview appears once this import saves a snapshot.",
    },
    pipeline: {
      title: "No pipeline stages yet",
      description: "Stages appear after the background worker starts.",
    },
    model: {
      title: "No model extraction yet",
      description:
        "Model, token and cost details appear when an extraction attempt is recorded.",
    },
  };

export function ImportEmptyState({ kind }: { kind: ImportEmptyKind }) {
  return (
    <ErrorState
      {...content[kind]}
      titleAs="h2"
      illustration={<ImportEmptyArtwork kind={kind} />}
    />
  );
}
