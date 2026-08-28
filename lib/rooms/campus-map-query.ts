const CAMPUS_MAP_QUERY_BATCH_SIZE = 75;

export function batchCampusMapQueryValues<T>(
  values: readonly T[],
  batchSize = CAMPUS_MAP_QUERY_BATCH_SIZE,
) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError(
      "Campus map query batch size must be a positive integer.",
    );
  }

  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    batches.push(values.slice(index, index + batchSize));
  }
  return batches;
}
