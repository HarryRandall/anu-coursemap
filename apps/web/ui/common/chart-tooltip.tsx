"use client";

/**
 * The one hover card used by every Recharts chart in Coursemap. It shares the
 * `.coursemap-tooltip` surface with Radix tooltips so charts and controls look
 * the same in both themes.
 */
export type ChartTooltipEntry = {
  name?: string | number;
  value?: string | number;
  color?: string;
};

export function ChartHoverCard({
  active,
  payload,
  label,
  suffix = "",
  showNames = true,
  format = (value) => String(value),
}: {
  active?: boolean;
  payload?: readonly ChartTooltipEntry[];
  label?: string | number;
  /** Appended after each value, for example " units". */
  suffix?: string;
  /** Hide series names for single-series charts. */
  showNames?: boolean;
  format?: (value: string | number) => string;
}) {
  const entries = (payload ?? []).filter((entry) => entry.value != null);
  if (!active || entries.length === 0) return null;
  return (
    <div className="coursemap-tooltip w-max max-w-56 px-3 py-2 text-xs">
      {label != null && label !== "" ? (
        <p className="mb-1 font-medium">{label}</p>
      ) : null}
      {entries.map((entry, index) => (
        <div key={index} className="flex items-baseline justify-between gap-3">
          {showNames && entry.name != null ? (
            <span className="flex items-center gap-1.5 opacity-80">
              {entry.color ? (
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              ) : null}
              {entry.name}
            </span>
          ) : null}
          <span className="shrink-0 font-semibold tabular-nums">
            {format(entry.value as string | number)}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}
