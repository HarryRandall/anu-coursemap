const numberFormat = new Intl.NumberFormat("en-AU", {
  maximumFractionDigits: 20,
});

export function formatImportDatabaseValue(
  field: string,
  value: unknown,
  timeZone: string,
): string {
  if (value === undefined) return "Not present";
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return /(^id$|_id$|year|code)/i.test(field)
      ? String(value)
      : numberFormat.format(value);
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const text = String(value);
  // Only timestamps with an explicit offset denote an unambiguous instant.
  // Date-only strings and identifiers must retain their original meaning.
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      text,
    )
  ) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return (
        new Intl.DateTimeFormat("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone,
        }).format(date) + ` (${timeZone})`
      );
    }
  }
  return text || '\"\"';
}
