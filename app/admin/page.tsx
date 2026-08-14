"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Braces,
  CheckCircle2,
  Clock3,
  GitBranch,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const changes = [0, 2, 1, 0, 4, 0, 3];
const days = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
const maxChange = Math.max(...changes, 1);

const kpis: {
  icon: ReactNode;
  tone: string;
  label: string;
  value: string;
  note: string;
  href: string;
}[] = [
  {
    icon: <BookOpen size={18} />,
    tone: "bg-brand-50 text-brand-600",
    label: "Course versions",
    value: "3,012",
    note: "2026 catalogue",
    href: "/admin/courses",
  },
  {
    icon: <Braces size={18} />,
    tone: "bg-sky-50 text-sky-600",
    label: "Programmes & structures",
    value: "516",
    note: "Degrees, majors and minors",
    href: "/admin/programmes",
  },
  {
    icon: <GitBranch size={18} />,
    tone: "bg-emerald-50 text-emerald-600",
    label: "Parsed relations",
    value: "8,742",
    note: "97.9% automatic confidence",
    href: "/admin/relations",
  },
  {
    icon: <AlertTriangle size={18} />,
    tone: "bg-amber-50 text-amber-600",
    label: "Needs review",
    value: "47",
    note: "21 mixed AND/OR rules",
    href: "/admin/relations?state=review",
  },
];

const reviewQueue = [
  { label: "Ambiguous AND/OR", value: 21, colour: "#8b5cf6" },
  { label: "Unresolved code", value: 9, colour: "#e05f7e" },
  { label: "Stale year link", value: 7, colour: "#ca7b16" },
  { label: "Unit mismatch", value: 5, colour: "#2883d8" },
  { label: "Other", value: 5, colour: "#8c8c96" },
];

export default function AdminOverviewPage() {
  return (
    <AppShell
      title="Catalogue overview"
      subtitle="Mock admin data · Supabase ready"
      admin
    >
      <h1 className="sr-only">Catalogue health at a glance</h1>

      {/* Compact single-row KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="group flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-xs ring-1 ring-zinc-200/70 transition hover:ring-zinc-300"
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${kpi.tone}`}
            >
              {kpi.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-medium text-zinc-500">
                {kpi.label}
              </span>
              <span className="block text-lg leading-tight font-bold tracking-tight text-zinc-900">
                {kpi.value}
                <span className="ml-1.5 text-[10px] font-medium text-zinc-400">
                  {kpi.note}
                </span>
              </span>
            </span>
            <ArrowRight
              size={14}
              className="shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500"
            />
          </Link>
        ))}
      </div>

      {/* Dashboard grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Changed pages chart */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Changed pages
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Daily incremental checks · last 7 runs
              </p>
            </div>
            <Badge tone="success">Low churn</Badge>
          </div>
          <div
            className="relative mt-6 h-40"
            role="img"
            aria-label="Changed pages over seven sync runs: 0, 2, 1, 0, 4, 0, 3"
          >
            {/* subtle gridlines */}
            <div className="absolute inset-x-0 top-0 h-px bg-zinc-100" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-100" />
            <div className="absolute inset-x-0 bottom-6 h-px bg-zinc-200" />
            <div className="absolute inset-0 flex items-end justify-around gap-3 pb-6">
              {changes.map((value, index) => (
                <div
                  key={index}
                  className="relative flex h-full w-8 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-[10px] font-medium text-zinc-400">
                    {value}
                  </span>
                  <div
                    className={
                      value === 0
                        ? "w-5 rounded-full bg-zinc-200"
                        : "w-5 rounded-full bg-brand-500"
                    }
                    style={{
                      height: `${Math.max(3, (value / maxChange) * 82)}%`,
                    }}
                  />
                  <span className="absolute -bottom-5 text-[10px] text-zinc-400">
                    {days[index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Parse state donut */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Parse state</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Across 2026 versioned entities
          </p>
          <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
            <div
              className="grid size-32 place-items-center rounded-full"
              style={{
                background:
                  "conic-gradient(var(--color-brand-500) 0 94.8%, var(--color-emerald-500) 94.8% 98.5%, var(--color-amber-400) 98.5% 100%)",
              }}
              role="img"
              aria-label="94.8 percent automatic, 3.7 percent human reviewed, 1.5 percent needs review"
            >
              <div className="grid size-[6.25rem] place-items-center rounded-full bg-white text-center">
                <div>
                  <p className="text-lg font-bold tracking-tight text-zinc-900">
                    98.5%
                  </p>
                  <p className="text-[10px] text-zinc-400">usable</p>
                </div>
              </div>
            </div>
            <ul className="flex flex-col gap-3 text-[12px]">
              {[
                ["Automatic", "94.8%", "bg-brand-500"],
                ["Human reviewed", "3.7%", "bg-emerald-500"],
                ["Needs review", "1.5%", "bg-amber-500"],
              ].map(([label, pct, dot]) => (
                <li key={label} className="flex items-center gap-2.5">
                  <span className={`size-2 rounded-full ${dot}`} />
                  <span className="font-medium text-zinc-700">{label}</span>
                  <span className="text-zinc-400">{pct}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Review queue */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Review queue
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Issues grouped by parser finding
              </p>
            </div>
            <Link
              href="/admin/relations?state=review"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Open queue <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-5 flex flex-col gap-3.5">
            {reviewQueue.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-zinc-700">
                    {item.label}
                  </span>
                  <span className="text-zinc-400">{item.value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.value / 21) * 100}%`,
                      background: item.colour,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Latest run */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Latest catalogue run
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                12 Aug 2026 at 2:15 am
              </p>
            </div>
            <Badge tone="success">
              <CheckCircle2 size={12} /> Complete
            </Badge>
          </div>
          <div className="mt-5 grid grid-cols-4 divide-x divide-zinc-100 overflow-hidden rounded-xl ring-1 ring-zinc-200">
            {[
              ["3,012", "checked"],
              ["3", "changed"],
              ["3,009", "unchanged"],
              ["0", "failed"],
            ].map(([value, label]) => (
              <div key={label} className="px-3 py-3">
                <p className="text-base font-bold tracking-tight text-zinc-900">
                  {value}
                </p>
                <p className="text-[10px] text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Clock3 size={16} className="text-zinc-400" />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-zinc-800">9m 14s</p>
              <p className="text-[10px] text-zinc-400">
                Incremental · 2026 courses
              </p>
            </div>
            <Link
              href="/admin/sync"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              View run <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
