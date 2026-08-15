"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeltResult } from "@/lib/catalogue";
import { Card } from "@/components/ui/card";

function formatTerm(term: string) {
  return term.replace(" 20", " ");
}

/** SELT agreement trend rendered with the shared chart library. */
export function StudentExperienceTrend({
  code,
  data,
}: {
  code: string;
  data: SeltResult[];
}) {
  const latest = data.at(-1)!;
  const first = data[0]!;
  const average = Math.round(
    data.reduce((sum, item) => sum + item.agreement, 0) / data.length,
  );
  const chartData = data.map((item) => ({
    term: formatTerm(item.term),
    agreement: item.agreement,
    responses: item.responses,
    enrolled: item.enrolled,
    responseRate: Math.round((item.responses / item.enrolled) * 100),
  }));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Student experience
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Overall learning experience, by teaching period.
          </p>
        </div>
        <p className="rounded-full bg-zinc-50 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
          Sample SELT-style data
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-center">
        <div className="border-b border-zinc-100 pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
          <p className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
            Latest agreement
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-zinc-950 tabular-nums">
            {latest.agreement}%
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {latest.term} · {latest.responses} of {latest.enrolled} responses
          </p>
          <dl className="mt-5 space-y-3 border-t border-zinc-100 pt-4 text-[12px]">
            <Metric
              label="Change"
              value={`${latest.agreement - first.agreement >= 0 ? "+" : ""}${latest.agreement - first.agreement} pts`}
            />
            <Metric label="Average" value={`${average}%`} />
            <Metric
              label="Response rate"
              value={`${Math.round((latest.responses / latest.enrolled) * 100)}%`}
            />
          </dl>
        </div>

        <figure
          className="min-w-0"
          aria-label={`Student experience trend for ${code}`}
        >
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="student-experience-area"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f1f3" />
              <XAxis
                axisLine={false}
                dataKey="term"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={[60, 100]}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(value: number) => `${value}%`}
                tickLine={false}
                ticks={[60, 70, 80, 90, 100]}
                width={44}
              />
              <Tooltip
                content={<ExperienceTooltip />}
                cursor={{ stroke: "#ddd6fe", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="agreement"
                name="Agreement"
                stroke="#7c3aed"
                strokeWidth={3}
                fill="url(#student-experience-area)"
                isAnimationActive={false}
                activeDot={{
                  r: 5,
                  fill: "#7c3aed",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                dot={{
                  r: 3.5,
                  fill: "#ffffff",
                  stroke: "#7c3aed",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <figcaption className="mt-2 text-[11px] text-zinc-500">
            Percentage of respondents who agreed that their overall learning
            experience was positive.
          </figcaption>
        </figure>
      </div>

      <ul className="sr-only">
        {data.map((item) => (
          <li key={item.term}>
            {`${item.term}: ${item.agreement}% agreement, ${item.responses} of ${item.enrolled} students responded`}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-800 tabular-nums">{value}</dd>
    </div>
  );
}

function ExperienceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      agreement: number;
      enrolled: number;
      responseRate: number;
      responses: number;
      term: string;
    };
  }>;
}) {
  if (!active || !payload?.[0]) return null;

  const item = payload[0].payload;
  return (
    <div className="min-w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium text-zinc-500">{item.term}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-900">
        {item.agreement}% agreement
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        {item.responses} of {item.enrolled} responses ({item.responseRate}%)
      </p>
    </div>
  );
}
