type StructureSnapshotAncestor = {
  id: number;
  parent_snapshot_id: number | null;
  origin: string;
};

/** Find the immutable import supplying a displayed structure's original text. */
export function originalStructureImportSnapshotId(
  snapshotId: number,
  snapshots: readonly StructureSnapshotAncestor[],
): number | null {
  const snapshotsById = new Map(snapshots.map((item) => [item.id, item]));
  const visited = new Set<number>();
  let ancestorId: number | null = snapshotId;
  while (ancestorId !== null && !visited.has(ancestorId)) {
    visited.add(ancestorId);
    const ancestor = snapshotsById.get(ancestorId);
    if (ancestor?.origin === "imported") return ancestor.id;
    ancestorId = ancestor?.parent_snapshot_id ?? null;
  }
  return null;
}
