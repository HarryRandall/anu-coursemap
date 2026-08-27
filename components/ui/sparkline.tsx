import { cn } from "@/lib/cn";

const width = 160;
const height = 40;

export type SparklineVariant = "area" | "bar" | "line";

function points(values: readonly number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  return values.map((value, index) => {
    const x =
      values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y =
      range === 0
        ? height / 2
        : height - 3 - ((value - min) / range) * (height - 6);
    return { x, y };
  });
}

function Bars({ values }: { values: readonly number[] }) {
  const max = Math.max(...values, 1);
  const gap = values.length > 6 ? 1.5 : 2.5;
  const barWidth = (width - gap * (values.length + 1)) / values.length;
  return (
    <>
      {values.map((value, index) => {
        const barHeight =
          value <= 0 ? 0 : Math.max(3, (value / max) * (height - 4));
        const x = gap + index * (barWidth + gap);
        return (
          <rect
            key={index}
            fill="currentColor"
            height={barHeight}
            rx="1"
            width={barWidth}
            x={x}
            y={height - barHeight}
          />
        );
      })}
    </>
  );
}

/** Compact SVG trend used inside dashboard stat tiles. */
export function Sparkline({
  className,
  label,
  values,
  variant = "area",
}: {
  className?: string;
  label: string;
  values: readonly number[];
  variant?: SparklineVariant;
}) {
  if (values.length === 0) return null;
  const plotted = points(values);
  const line = plotted
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const last = plotted[plotted.length - 1];
  const area = `${line} L${width} ${height} L0 ${height} Z`;

  return (
    <svg
      aria-label={label}
      className={cn("h-10 w-full text-brand-600", className)}
      fill="none"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>{label}</title>
      {variant === "bar" ? (
        <Bars values={values} />
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
            <circle
              cx={last.x}
              cy={last.y}
              fill="currentColor"
              r="2.25"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </>
      )}
    </svg>
  );
}
