import { CalendarDate, Clock, TrendUp01 } from "@untitledui/icons";
import { Badge } from "@uui/components/base/badges/badges";
import { Button } from "@uui/components/base/buttons/button";
import { cx } from "@uui/utils/cx";
import { DashboardMetrics } from "@/components/design-system/coursemap/dashboard-metrics";

const panel = "rounded-xl bg-primary ring-1 ring-secondary";

const iconTones = {
  brand: "bg-utility-brand-100 text-utility-brand-600",
  success: "bg-utility-green-100 text-utility-green-600",
  blue: "bg-utility-blue-100 text-utility-blue-600",
  warning: "bg-utility-yellow-100 text-utility-yellow-600",
} as const;

export function DegreeProgressHero() {
  const segments = [
    { label: "Completed", value: 96, width: 50, className: "bg-white" },
    {
      label: "Enrolled",
      value: 24,
      width: 12.5,
      className: "bg-white/70",
    },
    {
      label: "Planned",
      value: 42,
      width: 21.875,
      className: "bg-white/35",
    },
  ];

  return (
    <section className="bg-brand-solid relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-8">
      <div
        aria-hidden="true"
        className="absolute -top-28 -right-16 -z-10 size-80 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-36 left-1/3 -z-10 size-72 rounded-full bg-black/10 blur-3xl"
      />

      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-sm font-semibold text-white/70">
              Your degree
            </span>
            <div>
              <h2 className="text-display-xs md:text-display-sm font-semibold text-white">
                Bachelor of Advanced Computing
              </h2>
              <p className="text-md mt-1 text-white/70">
                AUBAC · 2025 commencement · Four-year programme
              </p>
            </div>
          </div>
          <Button href="#" color="secondary" size="sm">
            View degree plan
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-display-lg font-semibold tracking-tight text-white">
                  50%
                </p>
                <p className="text-sm text-white/70">
                  96 of 192 units completed
                </p>
              </div>
              <p className="text-sm font-medium text-white/80">
                30 units left to plan
              </p>
            </div>

            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-black/15 ring-1 ring-white/15"
              aria-label="96 completed, 24 enrolled, 42 planned and 30 units left to plan"
            >
              {segments.map((segment) => (
                <span
                  key={segment.label}
                  className={segment.className}
                  style={{ width: `${segment.width}%` }}
                />
              ))}
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {segments.map((segment) => (
                <li
                  key={segment.label}
                  className="flex items-center gap-2 text-sm text-white/75"
                >
                  <span
                    aria-hidden="true"
                    className={cx("size-2 rounded-full", segment.className)}
                  />
                  <span>
                    <strong className="font-semibold text-white">
                      {segment.value}
                    </strong>{" "}
                    {segment.label.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-w-52 flex-col gap-1 border-white/20 lg:border-l lg:pl-8">
            <p className="text-sm text-white/65">Expected completion</p>
            <p className="text-xl font-semibold text-white">November 2028</p>
            <p className="flex items-center gap-1.5 text-sm text-white/75">
              <Clock className="size-4" /> Seven teaching periods remaining
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PerformanceCard() {
  const results = [
    { label: "S1 2025", value: 68 },
    { label: "S2 2025", value: 72 },
    { label: "S1 2026", value: 76 },
    { label: "S2 2026", value: 81 },
  ];

  return (
    <section className={cx(panel, "flex h-full flex-col overflow-hidden")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-secondary px-5 py-4">
        <div>
          <h2 className="text-md font-semibold text-primary">
            Academic performance
          </h2>
          <p className="text-tertiary mt-0.5 text-sm">
            Recorded mark average by teaching period
          </p>
        </div>
        <Badge size="sm" type="pill-color" color="success">
          <TrendUp01 className="size-3" /> 13 points
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-tertiary text-sm">Current average</p>
            <p className="text-display-md mt-1 font-semibold tracking-tight text-primary">
              76.4
            </p>
          </div>
          <div className="text-right">
            <p className="text-tertiary text-sm">Best result</p>
            <p className="mt-1 text-lg font-semibold text-primary">84 · HD</p>
          </div>
        </div>

        <div className="grid min-h-44 grid-cols-4 items-end gap-3 border-b border-secondary px-1">
          {results.map((result, index) => (
            <div
              key={result.label}
              className="flex h-full flex-col items-center justify-end gap-2"
            >
              <span className="text-xs font-semibold text-secondary">
                {result.value}
              </span>
              <span
                className={cx(
                  "w-full max-w-14 rounded-t-lg",
                  index === results.length - 1
                    ? "bg-brand-solid"
                    : "bg-utility-brand-200",
                )}
                style={{ height: `${result.value}%` }}
              />
              <span className="text-quaternary pb-3 text-center text-[11px]">
                {result.label}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["HD", "4"],
            ["D", "6"],
            ["CR", "2"],
            ["P", "1"],
          ].map(([grade, count]) => (
            <div key={grade} className="rounded-lg bg-secondary p-2.5">
              <p className="text-lg font-semibold text-primary">{count}</p>
              <p className="text-tertiary text-xs">{grade}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function UpcomingDatesCard() {
  const dates = [
    {
      month: "SEP",
      day: "18",
      title: "Mid-semester teaching break",
      detail: "Semester 2 · One week",
      tone: "brand" as const,
    },
    {
      month: "NOV",
      day: "02",
      title: "Examination period begins",
      detail: "Check your published exam timetable",
      tone: "blue" as const,
    },
    {
      month: "NOV",
      day: "20",
      title: "Semester 2 concludes",
      detail: "Final day of the teaching period",
      tone: "success" as const,
    },
  ];

  return (
    <section className={cx(panel, "flex h-full flex-col overflow-hidden")}>
      <div className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4">
        <div>
          <h2 className="text-md font-semibold text-primary">Upcoming dates</h2>
          <p className="text-tertiary mt-0.5 text-sm">
            The next milestones in your academic year
          </p>
        </div>
        <CalendarDate className="text-fg-quaternary size-5" />
      </div>

      <ol className="flex flex-1 flex-col divide-y divide-secondary">
        {dates.map((date) => (
          <li key={`${date.month}-${date.day}`} className="flex gap-4 p-5">
            <div
              className={cx(
                "flex size-13 shrink-0 flex-col items-center justify-center rounded-lg",
                iconTones[date.tone],
              )}
            >
              <span className="text-[10px] font-bold tracking-wide">
                {date.month}
              </span>
              <span className="text-lg leading-5 font-semibold">
                {date.day}
              </span>
            </div>
            <div className="min-w-0 self-center">
              <p className="text-sm font-semibold text-primary">{date.title}</p>
              <p className="text-tertiary mt-1 text-sm">{date.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-secondary px-5 py-4">
        <Button href="#" size="sm" color="link-color">
          View the academic calendar
        </Button>
      </div>
    </section>
  );
}

export function AcademicDashboardMockup() {
  return (
    <div className="bg-secondary_alt flex flex-col gap-6 rounded-2xl p-4 ring-1 ring-secondary md:p-6 lg:p-8">
      <DashboardMetrics />

      <DegreeProgressHero />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <PerformanceCard />
        <UpcomingDatesCard />
      </div>
    </div>
  );
}
