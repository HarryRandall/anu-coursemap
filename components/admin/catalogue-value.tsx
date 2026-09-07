import { catalogueFieldLabel } from "@/lib/coursemap/catalogue-proposal-comparison";

/** A readable view of relational values; exact records remain in Database rows. */
export function CatalogueValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground">Not set</span>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (Array.isArray(value))
    return value.length ? (
      <ul className="space-y-3">
        {value.map((entry, index) => (
          <li key={index}>
            <CatalogueValue value={entry} />
          </li>
        ))}
      </ul>
    ) : (
      <span className="text-muted-foreground">None</span>
    );
  if (typeof value === "object")
    return (
      <dl className="space-y-1">
        {Object.entries(value)
          .filter(([, child]) => child !== null && child !== "")
          .map(([key, child]) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">
                {catalogueFieldLabel(key)}
              </dt>
              <dd>
                <CatalogueValue value={child} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return (
    <span className="break-words whitespace-pre-wrap">{String(value)}</span>
  );
}
