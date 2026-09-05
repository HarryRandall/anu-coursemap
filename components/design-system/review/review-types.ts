export const componentReviewDecisions = [
  "preferred",
  "keep",
  "remove",
] as const;

export type ComponentReviewDecision = (typeof componentReviewDecisions)[number];

export type ComponentReviewSource = "untitled" | "reui" | "coursemap";

export type ComponentReviewItem = {
  id: string;
  family: string;
  title: string;
  description?: string;
  source: ComponentReviewSource;
};

export type ComponentReviewRecord = ComponentReviewItem & {
  decision: ComponentReviewDecision;
  updatedAt: string;
};

export type ComponentReviewFile = {
  version: 1;
  updatedAt: string | null;
  decisions: Record<string, ComponentReviewRecord>;
};

export const emptyComponentReviewFile: ComponentReviewFile = {
  version: 1,
  updatedAt: null,
  decisions: {},
};

export function isComponentReviewDecision(
  value: unknown,
): value is ComponentReviewDecision {
  return componentReviewDecisions.some((decision) => decision === value);
}

export function isComponentReviewSource(
  value: unknown,
): value is ComponentReviewSource {
  return value === "untitled" || value === "reui" || value === "coursemap";
}

export function componentReviewDomId(id: string) {
  return `review-${id.replace(/[^a-z0-9]+/g, "-")}`;
}

function stableReviewHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Stable identifier for examples declared inside the existing laboratory. */
export function componentReviewItemId({
  family,
  source,
  title,
  description,
  namespace,
}: Pick<ComponentReviewItem, "family" | "source" | "title" | "description"> & {
  namespace?: string;
}) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const namespaceSlug = namespace
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const hash = stableReviewHash(
    `${namespace ?? ""}\u0000${title}\u0000${description ?? ""}`,
  );
  return `${source}:${family}:${namespaceSlug ? `${namespaceSlug}-` : ""}${slug || "example"}-${hash}`;
}
