"use client";

import { useState } from "react";
import {
  BarChart03,
  BookOpen01,
  GraduationHat01,
  Users01,
} from "@untitledui/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartLegendContent,
  ChartTooltipContent,
} from "@uui/components/application/charts/charts-base";
import {
  MetricBreakdownCard,
  MetricCard,
  MetricComparisonCard,
  MetricGaugeCard,
  MetricProgressCard,
  MetricTrendCard,
} from "@/components/design-system/coursemap/metric-card";
import {
  ButtonGroup,
  ButtonGroupItem,
} from "@uui/components/base/button-group/button-group";
import { enrolmentSeries, programmes, requirements } from "../content";
import { Example, FidelityNote, Grid, Stack } from "../section-frame";

const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "var(--color-text-tertiary)", fontSize: 12 },
} as const;

const anatomies = [
  { id: "figure", label: "Figure" },
  { id: "trend", label: "Trend" },
  { id: "progress", label: "Progress" },
  { id: "breakdown", label: "Breakdown" },
  { id: "gauge", label: "Gauge" },
  { id: "comparison", label: "Comparison" },
] as const;

const anatomySummaries: Record<string, string> = {
  figure:
    "A headline number with a change badge and a caption. The default for a dashboard row.",
  trend:
    "The same figure with a sparkline of recent teaching periods, for direction rather than magnitude.",
  progress:
    "A count against a target with a bar. Right for degree and requirement completion.",
  breakdown:
    "One total split into its parts, with a segmented bar and a legend. Right for unit status.",
  gauge: "A single percentage as a half circle, for one dominant figure.",
  comparison:
    "Several small figures stacked in one card, for a side-by-side read.",
};

function AnatomyGallery() {
  const [choice, setChoice] = useState<Set<string>>(() => new Set(["figure"]));
  const [log, setLog] = useState<string | null>(null);
  const current = [...choice][0] ?? "figure";
  const record = (key: string) => setLog(`${current}: ${key}`);

  const statusSegments = [
    {
      id: "completed",
      label: "Completed",
      value: 96,
      className: "bg-utility-green-500",
    },
    {
      id: "enrolled",
      label: "Enrolled",
      value: 24,
      className: "bg-utility-brand-500",
    },
    {
      id: "planned",
      label: "Planned",
      value: 36,
      className: "bg-utility-blue-500",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="relative -mr-4 overflow-hidden pr-4 sm:mr-0 sm:pr-0">
          <ButtonGroup
            size="sm"
            className="w-full max-w-full snap-x [scrollbar-width:none] overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
            selectedKeys={choice}
            onSelectionChange={(keys) => {
              const next = new Set([...keys].map(String));
              if (next.size > 0) setChoice(next);
            }}
          >
            {anatomies.map((anatomy) => (
              <ButtonGroupItem
                key={anatomy.id}
                id={anatomy.id}
                className="snap-start"
              >
                {anatomy.label}
              </ButtonGroupItem>
            ))}
          </ButtonGroup>
          <span
            aria-hidden="true"
            className="from-secondary_alt pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l to-transparent sm:hidden"
          />
        </div>
        <p className="text-tertiary text-sm">{anatomySummaries[current]}</p>
      </div>

      <Grid cols={3}>
        {current === "figure" && (
          <>
            <MetricCard
              label="Courses in plan"
              value="16"
              change={12}
              caption="Across four teaching periods."
              icon={BookOpen01}
              onAction={record}
            />
            <MetricCard
              label="Units completed"
              value="96"
              change={-4}
              caption="Half of the 192 unit programme."
              icon={GraduationHat01}
              onAction={record}
            />
            <MetricCard
              label="Advisers assigned"
              value="3"
              caption="No change this semester."
              icon={Users01}
              onAction={record}
            />
          </>
        )}

        {current === "trend" && (
          <>
            <MetricTrendCard
              label="Enrolments"
              value="2,492"
              change={14}
              data={enrolmentSeries}
              dataKey="enrolments"
              onAction={record}
            />
            <MetricTrendCard
              label="Withdrawals"
              value="96"
              change={-6}
              data={enrolmentSeries}
              dataKey="withdrawals"
              onAction={record}
            />
          </>
        )}

        {current === "progress" &&
          programmes.map((programme) => (
            <MetricProgressCard
              key={programme.id}
              label={programme.title}
              completed={programme.completed}
              total={programme.units}
              caption={`${programme.code} · ${programme.years} years`}
              onAction={record}
            />
          ))}

        {current === "breakdown" && (
          <>
            <MetricBreakdownCard
              label="Units by status"
              total={192}
              segments={statusSegments}
              onAction={record}
            />
            <MetricBreakdownCard
              label="Units by requirement group"
              total={192}
              segments={[
                {
                  id: "compulsory",
                  label: "Compulsory",
                  value: 36,
                  className: "bg-utility-brand-500",
                },
                {
                  id: "mathematics",
                  label: "Mathematics",
                  value: 12,
                  className: "bg-utility-indigo-500",
                },
                {
                  id: "electives",
                  label: "Electives",
                  value: 6,
                  className: "bg-utility-sky-500",
                },
              ]}
              onAction={record}
            />
          </>
        )}

        {current === "gauge" && (
          <>
            <MetricGaugeCard
              label="Degree progress"
              value={50}
              caption="of 192 units"
              onAction={record}
            />
            <MetricGaugeCard
              label="Compulsory courses"
              value={75}
              caption="of 48 units"
              onAction={record}
            />
            <MetricGaugeCard
              label="Elective breadth"
              value={0}
              caption="of 48 units"
              onAction={record}
            />
          </>
        )}

        {current === "comparison" && (
          <MetricComparisonCard
            label="Requirement groups"
            rows={requirements.map((requirement) => ({
              id: requirement.id,
              label: requirement.title,
              value: `${requirement.completed}/${requirement.required}`,
              percentage: (requirement.completed / requirement.required) * 100,
            }))}
            onAction={record}
          />
        )}
      </Grid>

      <p className="text-tertiary text-sm">
        {log ?? "Open a card menu and choose an item. The result appears here."}
      </p>
    </div>
  );
}

function MetricRow() {
  const [log, setLog] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Grid cols={4}>
        <MetricCard
          label="Courses in plan"
          value="16"
          change={12}
          caption="Across four teaching periods."
          icon={BookOpen01}
          onAction={(key) => setLog(`Courses in plan: ${key}`)}
        />
        <MetricCard
          label="Units completed"
          value="96"
          change={-4}
          caption="Half of the 192 unit programme."
          icon={GraduationHat01}
          onAction={(key) => setLog(`Units completed: ${key}`)}
        />
        <MetricTrendCard
          label="Enrolments"
          value="2,492"
          change={14}
          data={enrolmentSeries}
          dataKey="enrolments"
          onAction={(key) => setLog(`Enrolments: ${key}`)}
        />
        <MetricProgressCard
          label="Degree progress"
          completed={96}
          total={192}
          onAction={(key) => setLog(`Degree progress: ${key}`)}
        />
      </Grid>

      <p className="text-tertiary text-sm">
        {log ?? "Open a card menu and choose an item. The result appears here."}
      </p>
    </div>
  );
}

export function MetricsSection() {
  return (
    <Stack>
      <FidelityNote>
        Untitled UI&rsquo;s metric cards are PRO-only, so these are composed
        here from the free Badge, Dropdown, ProgressBar and FeaturedIcon
        primitives. The charts below use the MIT charts-base tooltip and legend
        directly.
      </FidelityNote>

      <Example
        title="Six anatomies"
        bare
        description="Switch between the options rather than comparing six copies of one card. Every card menu works."
      >
        <AnatomyGallery />
      </Example>

      <Example
        title="A dashboard row"
        bare
        description="Four different anatomies side by side, as a real metric strip would mix them."
      >
        <MetricRow />
      </Example>

      <Example
        title="Line chart"
        description="Recharts with the MIT tooltip and legend from charts-base. Hover a point, or focus the chart and use the arrow keys."
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={enrolmentSeries}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border-secondary)"
              />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis {...axisProps} />
              <RechartsTooltip content={<ChartTooltipContent />} />
              <Legend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="enrolments"
                name="Enrolments"
                stroke="var(--color-utility-brand-600)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="withdrawals"
                name="Withdrawals"
                stroke="var(--color-utility-orange-500)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Example>

      <Example
        title="Bar chart"
        description="The same data as bars, for period-to-period comparison."
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enrolmentSeries}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border-secondary)"
              />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis {...axisProps} />
              <RechartsTooltip
                cursor={{ fill: "var(--color-bg-secondary)" }}
                content={<ChartTooltipContent />}
              />
              <Legend content={<ChartLegendContent />} />
              <Bar
                dataKey="enrolments"
                name="Enrolments"
                fill="var(--color-utility-brand-600)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="withdrawals"
                name="Withdrawals"
                fill="var(--color-utility-neutral-300)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Example>

      <Example
        title="Empty chart"
        description="What a metric surface shows before any catalogue year has been imported."
        bare
      >
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl bg-primary ring-1 ring-secondary">
          <BarChart03 className="text-fg-quaternary size-6" />
          <p className="text-sm font-semibold text-secondary">
            No enrolment data yet
          </p>
          <p className="text-tertiary max-w-sm text-center text-sm">
            Enrolment figures appear once a catalogue year has been imported and
            matched to a teaching period.
          </p>
        </div>
      </Example>
    </Stack>
  );
}
