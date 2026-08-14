"use client";

import { ArrowRight, Check, Clock3, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { CourseDrawer } from "@/components/overlays";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseToken } from "@/components/ui/course-token";
import { statusTone, toneClasses } from "@/lib/ui";
import { cn } from "@/lib/cn";
import { courseByCode, terms } from "@/lib/catalogue";

export default function HistoryPage() {
  const { state } = useCoursemap();
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const attempts = [...state.attempts].sort((a, b) => {
    const aIndex = terms.findIndex((term) => term.id === a.termId);
    const bIndex = terms.findIndex((term) => term.id === b.termId);
    return aIndex - bIndex;
  });

  const summary = [
    {
      icon: <Check size={16} />,
      value: attempts.filter((item) => item.status === "completed").length,
      label: "completed",
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: <Clock3 size={16} />,
      value: attempts.filter((item) => item.status === "planned").length,
      label: "planned",
      tone: "bg-sky-50 text-sky-600",
    },
    {
      icon: <X size={16} />,
      value: attempts.filter((item) => item.status === "failed").length,
      label: "failed attempts",
      tone: "bg-rose-50 text-rose-600",
    },
    {
      icon: <RotateCcw size={16} />,
      value: new Set(attempts.map((item) => item.courseCode)).size,
      label: "unique courses",
      tone: "bg-brand-50 text-brand-600",
    },
  ];

  return (
    <AppShell title="Course history" subtitle="Every attempt stays visible">
      <h1 className="sr-only">Course history</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="flex items-center gap-3 p-4">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg",
                item.tone,
              )}
            >
              {item.icon}
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight text-zinc-900">
                {item.value}
              </p>
              <p className="text-[11px] text-zinc-400">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">
              All attempts
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Chronological view of your current demo plan.
            </p>
          </div>
          <Badge tone="neutral">{attempts.length} records</Badge>
        </div>

        {/* Header row (desktop) */}
        <div className="hidden grid-cols-[minmax(0,1.6fr)_1fr_0.8fr_0.5fr_0.8fr_auto] gap-4 border-b border-zinc-100 bg-zinc-50/70 px-5 py-2.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase md:grid">
          <span>Course</span>
          <span>Study period</span>
          <span>Status</span>
          <span>Mark</span>
          <span>Units earned</span>
          <span />
        </div>

        <div className="divide-y divide-zinc-100">
          {attempts.map((attempt) => {
            const course = courseByCode(attempt.courseCode);
            const term = terms.find((item) => item.id === attempt.termId);
            if (!course || !term) return null;
            return (
              <button
                key={attempt.id}
                type="button"
                onClick={() => setSelectedAttempt(attempt.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition hover:bg-zinc-50/70 md:grid-cols-[minmax(0,1.6fr)_1fr_0.8fr_0.5fr_0.8fr_auto]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <CourseToken
                    code={course.code}
                    accent={course.accent}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-zinc-900">
                      {course.code}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-400">
                      {course.name}
                    </span>
                  </span>
                </span>
                <span className="hidden text-[12px] text-zinc-600 md:block">
                  {term.name} {term.year < 2029 ? term.year : ""}
                </span>
                <span className="hidden md:block">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset",
                      toneClasses[statusTone[attempt.status]],
                    )}
                  >
                    {attempt.status}
                  </span>
                </span>
                <span className="hidden text-[12px] text-zinc-600 md:block">
                  {attempt.mark ?? "–"}
                </span>
                <span className="hidden text-[12px] text-zinc-600 md:block">
                  {attempt.status === "completed"
                    ? `${course.units} units`
                    : "0 units"}
                </span>
                <ArrowRight
                  size={16}
                  className="justify-self-end text-zinc-300"
                />
              </button>
            );
          })}
        </div>
      </Card>

      {selectedAttempt && (
        <CourseDrawer
          attemptId={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </AppShell>
  );
}
