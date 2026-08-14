import type { ReactNode } from "react";
import { ArrowDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CourseToken } from "@/components/ui/course-token";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

type CourseAccent = "blue" | "violet" | "mint" | "amber" | "rose" | "cyan";

function OverlayShell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[min(100%,22rem)] rounded-2xl bg-white/95 shadow-lg ring-1 ring-zinc-200/80 backdrop-blur-sm",
        className,
      )}
    >
      <p className="border-b border-zinc-100 px-4 py-2.5 font-mono text-[11px] font-medium text-zinc-500">
        {label}
      </p>
      <div className="p-3">{children}</div>
    </div>
  );
}

function CourseRow({
  code,
  name,
  units,
  accent,
  session,
}: {
  code: string;
  name: string;
  units: number;
  accent: CourseAccent;
  session: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2">
      <CourseToken code={code} accent={accent} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-zinc-900">
          {code} <span className="font-medium text-zinc-600">{name}</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge tone="neutral">{units} units</Badge>
          <Badge tone="info">{session}</Badge>
        </div>
      </div>
    </div>
  );
}

export function CoursesOverlay() {
  return (
    <OverlayShell label="Courses · 2026 catalogue">
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
        <Search className="size-3.5 text-zinc-400" aria-hidden="true" />
        <p className="text-xs text-zinc-600">software</p>
      </div>
      <CourseRow
        code="COMP2100"
        name="Software Design Methodologies"
        units={6}
        accent="amber"
        session="Semester 1"
      />
      <CourseRow
        code="COMP3900"
        name="Computing Project"
        units={12}
        accent="amber"
        session="Semester 1 or 2"
      />
    </OverlayShell>
  );
}

function PrerequisiteStep({
  code,
  name,
  accent,
  status,
}: {
  code: string;
  name: string;
  accent: CourseAccent;
  status: "completed" | "planned" | "blocked";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200/80">
      <CourseToken code={code} accent={accent} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-zinc-900">
          {code}
        </p>
        <p className="truncate text-[11px] text-zinc-500">{name}</p>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

export function PrerequisitesOverlay() {
  return (
    <OverlayShell label="Prerequisites · COMP2100">
      <PrerequisiteStep
        code="COMP1100"
        name="Programming as Problem Solving"
        accent="blue"
        status="completed"
      />
      <div className="flex items-center gap-2 py-1.5 pl-5 text-[11px] font-medium text-zinc-500">
        <ArrowDown className="size-3.5" aria-hidden="true" />
        Required before COMP1110
      </div>
      <PrerequisiteStep
        code="COMP1110"
        name="Structured Programming"
        accent="mint"
        status="planned"
      />
      <div className="flex items-center gap-2 py-1.5 pl-5 text-[11px] font-medium text-zinc-500">
        <ArrowDown className="size-3.5" aria-hidden="true" />
        Required before COMP2100
      </div>
      <PrerequisiteStep
        code="COMP2100"
        name="Software Design Methodologies"
        accent="amber"
        status="blocked"
      />
    </OverlayShell>
  );
}

function PlanRow({
  code,
  name,
  units,
  accent,
  status,
}: {
  code: string;
  name: string;
  units: number;
  accent: CourseAccent;
  status: "completed" | "planned" | "enrolled";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <CourseToken code={code} accent={accent} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-zinc-900">
          {code}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {name} · {units}u
        </p>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

export function PlanOverlay() {
  return (
    <OverlayShell label="Plan · Semester 1 2026">
      <PlanRow
        code="COMP1100"
        name="Programming as Problem Solving"
        units={6}
        accent="blue"
        status="enrolled"
      />
      <PlanRow
        code="MATH1005"
        name="Discrete Mathematical Models"
        units={6}
        accent="violet"
        status="planned"
      />
      <PlanRow
        code="COMP1110"
        name="Structured Programming"
        units={6}
        accent="mint"
        status="planned"
      />
      <div className="mt-1 flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
        <span>Study load</span>
        <span>18 of 24 units</span>
      </div>
    </OverlayShell>
  );
}
