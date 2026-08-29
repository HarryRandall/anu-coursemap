type ReviewItemState = {
  isBlocking: boolean;
  status: string;
};

export function countOpenBlockingReviewItems(
  reviewItems: readonly ReviewItemState[],
) {
  return reviewItems.filter(
    ({ isBlocking, status }) => isBlocking && status === "open",
  ).length;
}

export function reviewConfidenceTone(
  confidence: number,
  needsAdministratorAttention: boolean,
) {
  return needsAdministratorAttention || confidence < 0.85
    ? ("warning" as const)
    : ("success" as const);
}

export function courseImportConfidenceTone(
  confidence: number,
  openBlockingReviewCount: number,
) {
  return reviewConfidenceTone(confidence, openBlockingReviewCount > 0);
}
