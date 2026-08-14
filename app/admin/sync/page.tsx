"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";

type Run = {
  id: string;
  scope: string;
  trigger: string;
  started: string;
  duration: string;
  checked: number;
  added: number;
  changed: number;
  unchanged: number;
  failed: number;
  status: "Complete" | "Failed";
};

const initialRuns: Run[] = [
  { id: "run_8f3c12", scope: "2026 courses", trigger: "Schedule", started: "12 Aug, 2:15 am", duration: "9m 14s", checked: 3012, added: 0, changed: 3, unchanged: 3009, failed: 0, status: "Complete" },
  { id: "run_5da910", scope: "2026 programmes", trigger: "Schedule", started: "12 Aug, 2:05 am", duration: "4m 32s", checked: 516, added: 0, changed: 0, unchanged: 516, failed: 0, status: "Complete" },
  { id: "run_29ac44", scope: "2025 failed items", trigger: "Harry", started: "11 Aug, 4:42 pm", duration: "1m 08s", checked: 9, added: 0, changed: 2, unchanged: 6, failed: 1, status: "Failed" },
  { id: "run_11b7e0", scope: "2026 courses", trigger: "Schedule", started: "11 Aug, 2:15 am", duration: "8m 58s", checked: 3012, added: 0, changed: 0, unchanged: 3012, failed: 0, status: "Complete" },
];

const stages = ["Discover", "Compare hashes", "Parse changes", "Validate"];

export default function AdminSyncPage() {
  const { notify } = useCoursemap();
  const [scope, setScope] = useState("2026 courses and programmes");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runs, setRuns] = useState(initialRuns);
  const [advanced, setAdvanced] = useState(false);
  const [requestGap, setRequestGap] = useState(5);
  const [detection, setDetection] = useState("Content hash + HTTP validators");
  const [schedules, setSchedules] = useState({ current: true, next: true, previous: true });

  useEffect(() => {
    if (!running) return;
    let current = 2;
    const timer = window.setInterval(() => {
      current = Math.min(100, current + 8);
      setProgress(current);
      if (current >= 100) {
        window.clearInterval(timer);
        setRunning(false);
        setRuns((existing) => [
          { id: "run_demo_new", scope, trigger: "Harry", started: "Just now", duration: "3s demo", checked: 3012, added: 0, changed: 3, unchanged: 3009, failed: 0, status: "Complete" },
          ...existing,
        ]);
        notify("Incremental sync simulation completed");
      }
    }, 220);
    return () => window.clearInterval(timer);
  }, [notify, running, scope]);

  const stage =
    !running && progress >= 100
      ? "Complete"
      : progress < 22
        ? "Discovering entity pages"
        : progress < 60
          ? "Comparing content hashes"
          : progress < 88
            ? "Parsing changed pages"
            : "Validating relations";

  const stageIndex = progress >= 100 ? 4 : progress >= 85 ? 3 : progress >= 55 ? 2 : progress >= 20 ? 1 : 0;

  const start = (full = false) => {
    if (full && !window.confirm("Run a full historical sync? This would inspect about 56,846 pages when a backend is connected.")) return;
    setProgress(2);
    setRunning(true);
    notify(full ? "Historical sync simulation started" : "Incremental sync simulation started");
  };

  const toggleSchedule = (key: keyof typeof schedules, label: string) => {
    setSchedules((current) => {
      const next = { ...current, [key]: !current[key] };
      notify(next[key] ? `${label} schedule enabled` : `${label} schedule paused`);
      return next;
    });
  };

  return (
    <AppShell title="Sync" subtitle="Schedules, runs and changed-page checks" admin>
      <h1 className="sr-only">Sync</h1>
      {/* Launch card */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 items-center gap-4 p-5 md:grid-cols-[auto_1fr_auto_auto]">
          <span
            className={cn(
              "grid size-11 place-items-center rounded-xl",
              running ? "bg-brand-100 text-brand-600" : "bg-brand-600 text-white",
            )}
          >
            {running ? <RefreshCw size={20} className="animate-spin-slow" /> : <Zap size={20} />}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Incremental sync
            </p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900">
              {running ? stage : "Ready to check the catalogue"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {running
                ? `${progress}% complete · mock run`
                : "Unchanged content skips parsing and database writes."}
            </p>
          </div>
          <Field label="Scope" className="w-full md:w-60">
            <Select
              aria-label="Sync scope"
              value={scope}
              onChange={setScope}
              disabled={running}
              options={[
                "2026 courses and programmes",
                "2026 courses only",
                "2026 programmes only",
                "2025 failed items",
              ].map((item) => ({ value: item, label: item }))}
            />
          </Field>
          <Button variant="primary" disabled={running} onClick={() => start(false)}>
            {running ? <RefreshCw size={16} className="animate-spin-slow" /> : <Play size={16} />}
            {running ? "Running" : "Run incremental sync"}
          </Button>
        </div>

        <div className="h-1.5 bg-brand-100/60">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-2 border-t border-brand-100/60 sm:grid-cols-4">
          {stages.map((label, index) => {
            const done = stageIndex > index;
            const active = stageIndex === index && running;
            return (
              <div key={label} className="flex items-center gap-2 px-4 py-3">
                <span
                  className={cn(
                    "size-2 rounded-full ring-1",
                    done
                      ? "bg-emerald-500 ring-emerald-500"
                      : active
                        ? "bg-brand-500 ring-brand-500 ring-offset-2"
                        : "bg-white ring-zinc-300",
                  )}
                />
                <span
                  className={cn(
                    "text-[11px]",
                    done ? "text-emerald-600" : active ? "font-medium text-brand-600" : "text-zinc-400",
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Schedule + economics */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Schedule</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Cheap checks for active years, fewer for stable history.
              </p>
            </div>
            <Clock3 size={18} className="text-zinc-400" />
          </div>
          <div className="divide-y divide-zinc-100">
            {[
              ["current", "Current catalogue year", "2026 · daily at 2:15 am"] as const,
              ["next", "Next catalogue year", "2027 · daily once published"] as const,
              ["previous", "Previous catalogue year", "2025 · weekly on Sunday"] as const,
            ].map(([key, title, note]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5">
                <span>
                  <span className="block text-[13px] font-semibold text-zinc-800">{title}</span>
                  <span className="block text-[11px] text-zinc-400">{note}</span>
                </span>
                <input
                  type="checkbox"
                  aria-label={`Enable ${title} schedule`}
                  checked={schedules[key]}
                  onChange={() => toggleSchedule(key, title)}
                  className="size-4 accent-brand-500"
                />
              </label>
            ))}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span>
                <span className="block text-[13px] font-semibold text-zinc-800">
                  Older historical years
                </span>
                <span className="block text-[11px] text-zinc-400">Frozen · manual recheck only</span>
              </span>
              <Badge tone="neutral">Manual</Badge>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Why this stays cheap</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Typical daily run with very low catalogue churn.</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
              {[
                ["3,012", "pages checked"],
                null,
                ["3", "hashes changed"],
                null,
                ["3", "rows reparsed"],
              ].map((item, index) =>
                item ? (
                  <div
                    key={index}
                    className="rounded-xl bg-zinc-50/80 px-2 py-4 text-center ring-1 ring-zinc-200"
                  >
                    <p className="text-lg font-bold tracking-tight text-zinc-900">{item[0]}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{item[1]}</p>
                  </div>
                ) : (
                  <span key={index} className="text-center text-zinc-300">
                    →
                  </span>
                ),
              )}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[12px] font-semibold text-emerald-800">3,009 database writes avoided</p>
                <p className="mt-0.5 text-[11px] leading-snug text-emerald-700/80">
                  Source snapshots remain versioned and unchanged history stays frozen.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced */}
      <Card className="mt-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvanced((current) => !current)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left"
        >
          <Settings2 size={17} className="text-brand-500" />
          <span className="flex-1">
            <span className="block text-[13px] font-semibold text-zinc-800">
              Advanced sync settings
            </span>
            <span className="block text-[11px] text-zinc-400">
              Request gap, hash strategy and historical scope
            </span>
          </span>
          <ChevronDown size={17} className={cn("text-zinc-400 transition", advanced && "rotate-180")} />
        </button>
        {advanced && (
          <div className="grid grid-cols-1 gap-4 border-t border-zinc-100 bg-zinc-50/70 p-5 sm:grid-cols-2">
            <Field label="Request gap" hint="Minimum 5 ms in this prototype. Production should follow live site policy and observed rate limits.">
              <div className="grid grid-cols-[1fr_auto]">
                <Input
                  type="number"
                  min={5}
                  max={1000}
                  value={requestGap}
                  onChange={(event) => setRequestGap(Math.max(5, Number(event.target.value)))}
                  className="rounded-r-none"
                />
                <span className="grid place-items-center rounded-r-lg bg-zinc-100 px-3 text-xs text-zinc-500 ring-1 ring-inset ring-zinc-200">
                  ms
                </span>
              </div>
            </Field>
            <Field label="Change detection" hint="ETag and Last-Modified avoid unnecessary response bodies where supported.">
              <Select
                aria-label="Change detection"
                value={detection}
                onChange={setDetection}
                options={["Content hash + HTTP validators", "Content hash only"].map((item) => ({ value: item, label: item }))}
              />
            </Field>
            <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold text-zinc-800">Full historical sync</p>
                <p className="text-[11px] text-zinc-400">
                  About 56,846 course pages. Use only for initial backfill or parser migration.
                </p>
              </div>
              <Button variant="danger" disabled={running} onClick={() => start(true)}>
                Run full history
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Run history */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Run history</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Discovery, changes, failures and trigger details.</p>
          </div>
          <Badge tone="neutral">{runs.length} runs</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {["Run", "Scope", "Trigger", "Started", "Duration", "Checked", "Added", "Changed", "Unchanged", "Failed", "Status", ""].map(
                  (head, index) => (
                    <th key={index} className="whitespace-nowrap px-3 py-2.5 first:pl-4">
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {runs.map((run) => (
                <tr key={run.id} className="transition hover:bg-zinc-50/70">
                  <td className="px-3 py-3 pl-4">
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                      {run.id}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-600">{run.scope}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.trigger}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{run.started}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.duration}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.checked.toLocaleString()}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.added}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.changed}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.unchanged.toLocaleString()}</td>
                  <td className="px-3 py-3 text-zinc-600">{run.failed}</td>
                  <td className="px-3 py-3">
                    <Badge tone={run.status === "Complete" ? "success" : "danger"}>
                      {run.status === "Complete" ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {run.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {run.failed > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setScope("2025 failed items");
                          start(false);
                        }}
                        aria-label={`Retry failures from ${run.id}`}
                        className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
