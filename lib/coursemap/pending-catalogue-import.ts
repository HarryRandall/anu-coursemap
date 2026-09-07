/** A completed import awaiting a decision in its catalogue workspace. */
export type PendingCatalogueImport = {
  targetId: string;
  runId: string;
  candidateSnapshotId: number;
  baselineDraftSnapshotId: number | null;
  baselinePublishedSnapshotId: number | null;
  reviewStatus: string;
  createdAt: string;
  isCurrentDraftSource?: boolean;
};
