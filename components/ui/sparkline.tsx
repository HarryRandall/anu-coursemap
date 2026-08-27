import { cn } from "@/lib/cn";

const width = 200;
const height = 32;
const padX = 4;
const padY = 5;

export type SparklineVariant = "area" | "bar" | "line";

/**
 * Inset the path so the end marker is not clipped. Pass `domainMax` to plot
 * several tiles on the same absolute scale so larger totals read taller.
 */
function points(values: readonly number[], domainMax: number) {
  const max = Math.max(domainMax, 1);
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;
  return values.map((value, index) => {
    const x =
      values.length <= 1
        ? width / 2
        : padX + (index / (values.length - 1)) * plotWidth;
    const y = padY + plotHeight - (Math.max(value, 0) / max) * plotHeight;
    return { x, y };
  });
}

function Bars({
  values,
  domainMax,
}: {
  values: readonly number[];
  domainMax: number;
}) {
  const max = Math.max(domainMax, 1);
  const gap = values.length > 6 ? 1.5 : 2;
  const plotWidth = width - padX * 2;
  const barWidth = (plotWidth - gap * (values.length - 1)) / values.length;
  return (
    <>
      {values.map((value, index) => {
        const barHeight =
          value <= 0 ? 0 : Math.max(2, (value / max) * (height - padY * 2));
        const x = padX + index * (barWidth + gap);
        return (
          <rect
            key={index}
            fill="currentColor"
            height={barHeight}
            rx="1"
            width={Math.max(barWidth, 1)}
            x={x}
            y={height - padY - barHeight}
          />
        );
      })}
    </>
  );
}

/** Compact SVG trend used inside dashboard stat tiles. */
export function Sparkline({
  className,
  domainMax,
  label,
  values,
  variant = "area",
}: {
  className?: string;
  /** Absolute ceiling for the Y axis. Defaults to the series maximum. */
  domainMax?: number;
  label: string;
  values: readonly number[];
  variant?: SparklineVariant;
}) {
  if (values.length === 0) return null;
  const resolvedMax = domainMax ?? Math.max(...values, 1);
  const plotted = points(values, resolvedMax);
  const line = plotted
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const last = plotted[plotted.length - 1];
  const area = `${line} L${last?.x ?? width - padX} ${height - padY} L${padX} ${height - padY} Z`;

  return (
    <svg
      aria-label={label}
      className={cn("h-8 w-full overflow-visible text-brand-600", className)}
      fill="none"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>{label}</title>
      {variant === "bar" ? (
        <Bars domainMax={resolvedMax} values={values} />
      ) : (
        <>
          {variant === "area" ? (
            <path d={area} fill="currentColor" opacity="0.14" />
          ) : null}
          <path
            d={line}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            vectorEffect="non-scaling-stroke"
          />
          {last ? (
            <>
              <circle
                cx={last.x}
                cy={last.y}
                fill="white"
                r="3"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={last.x}
                cy={last.y}
                fill="currentColor"
                r="1.75"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
        </>
      )}
    </svg>
  );
}
