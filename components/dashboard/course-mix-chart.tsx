import { Card, CardHeader } from "@/components/ui/card";

const colours = ["#6d28d9", "#8b5cf6", "#c4b5fd"];

export function CourseMixChart({
  levels,
}: {
  levels: Array<{ level: number; label: string; count: number }>;
}) {
  const total = levels.reduce((sum, item) => sum + item.count, 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const segments = levels.reduce<
    Array<{
      level: number;
      length: number;
      offset: number;
      colour: string;
    }>
  >((items, item, index) => {
    if (total === 0 || item.count === 0) return items;
    const length = (item.count / total) * circumference;
    const offset = items.reduce((sum, segment) => sum + segment.length, 0);
    return [
      ...items,
      { level: item.level, length, offset, colour: colours[index] },
    ];
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Course mix"
        description={
          total === 0
            ? "No courses in the plan yet"
            : `${total} courses in your plan`
        }
      />
      <div className="flex items-center gap-5 border-t border-zinc-100 px-5 py-5">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 96 96" className="-rotate-90" aria-hidden="true">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              className="stroke-zinc-100"
              strokeWidth="14"
            />
            {segments.map((segment) => (
              <circle
                key={segment.level}
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke={segment.colour}
                strokeWidth="14"
                strokeDasharray={`${segment.length} ${circumference}`}
                strokeDashoffset={-segment.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-lg font-bold text-zinc-900 tabular-nums">
              {total}
            </p>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {levels.map((item, index) => (
            <li
              key={item.level}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <span className="flex items-center gap-2 text-zinc-500">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colours[index] }}
                  aria-hidden="true"
                />
                {item.label}
              </span>
              <span className="font-semibold text-zinc-800 tabular-nums">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
