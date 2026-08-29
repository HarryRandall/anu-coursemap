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

export function courseImportConfidenceTone(
  confidence: number,
  openBlockingReviewCount: number,
) {
  return openBlockingReviewCount > 0 || confidence < 0.85
    ? ("warning" as const)
    : ("success" as const);
}
