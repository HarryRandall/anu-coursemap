export type ImportModel = {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  visible: boolean;
  input_usd_per_million: number | null;
  output_usd_per_million: number | null;
  pricing_updated_at: string | null;
};

export const ESTIMATED_IMPORT_INPUT_TOKENS = 10_000;
export const ESTIMATED_IMPORT_OUTPUT_TOKENS = 2_000;

export function estimatedImportCost(model: ImportModel) {
  if (
    model.input_usd_per_million === null ||
    model.output_usd_per_million === null
  )
    return null;
  return (
    (model.input_usd_per_million * ESTIMATED_IMPORT_INPUT_TOKENS +
      model.output_usd_per_million * ESTIMATED_IMPORT_OUTPUT_TOKENS) /
    1_000_000
  );
}

export function formatImportPrice(usd: number | null) {
  if (usd === null || !Number.isFinite(usd) || usd < 0) return "—";
  if (usd === 0) return "$0";
  if (usd < 0.01) {
    const cents = usd * 100;
    return cents < 0.001 ? "<0.001¢" : `${Number(cents.toFixed(3))}¢`;
  }
  return `$${usd.toFixed(2)}`;
}
