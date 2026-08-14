"use client";

import {
  AlertTriangle,
  BookMarked,
  CalendarDays,
  Check,
  ExternalLink,
  Info,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { courseByCode } from "@/lib/catalogue";
import { effectiveStatus, missingPrereqs } from "@/lib/planner";
import { Drawer } from "@/components/ui/overlay";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

export function CourseDrawer({
  attemptId,
  onClose,
}: {
  attemptId: string;
  onClose: () => void;
}) {
  const { state, updateAttempt, removeAttempt, togglePermission, notify } = useCoursemap();
  const attempt = state.attempts.find((item) => item.id === attemptId);
  const course = attempt ? courseByCode(attempt.courseCode) : undefined;
  const status = attempt ? effectiveStatus(attempt, state.attempts) : "planned";

  if (!attempt || !course) return null;

  const missing = new Set(missingPrereqs(attempt, state.attempts));
  const prereqsMet = missing.size === 0;
  const recorded = attempt.status === "completed" || attempt.status === "failed";
  const remove = () => {
    const result = removeAttempt(attempt.id);
    notify(result.message, result.ok ? "success" : "warning");
    if (result.ok) onClose();
  };

  return (
    <Drawer onClose={onClose} labelledBy="drawer-title">
      <IconButton
        label="Close course details"
        onClick={onClose}
        className="absolute right-4 top-4 z-10"
      >
        <X size={18} />
      </IconButton>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
        <div className="flex min-w-0 items-center gap-2 pr-12">
          <p className="font-mono text-[11px] font-medium text-zinc-400">{course.code}</p>
          <StatusPill status={status} />
        </div>
        <h2
          id="drawer-title"
          className="mt-3 text-2xl font-bold leading-tight tracking-tight text-zinc-900"
        >
          {course.name}
        </h2>

        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{course.description}</p>

        <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-200 rounded-xl ring-1 ring-zinc-200">
          {[
            ["Units", String(course.units)],
            ["Level", String(course.level)],
            ["Offered", course.sessions.map((item) => item.replace("Semester ", "S")).join(" · ")],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-zinc-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 divide-y divide-zinc-200 rounded-xl ring-1 ring-zinc-200">
          {[
            [<UserRound key="i" size={16} />, "Convener", course.convener],
            [<CalendarDays key="i" size={16} />, "Delivery", course.delivery],
            [<BookMarked key="i" size={16} />, "Counts towards", course.countsTowards.join(", ")],
          ].map(([icon, label, value], index) => (
            <div
              key={index}
              className="grid grid-cols-[1.25rem_5rem_1fr] items-center gap-2.5 px-3 py-3"
            >
              <span className="text-zinc-400">{icon}</span>
              <span className="text-xs text-zinc-400">{label}</span>
              <span className="text-xs font-medium text-zinc-700">{value}</span>
            </div>
          ))}
        </div>

        <ButtonLink
          variant="secondary"
          size="md"
          href={`/courses/${course.code}`}
          className="mt-3 !h-auto w-full justify-between px-3 py-2.5 text-left"
        >
          <span className="min-w-0 whitespace-normal">
            <span className="block text-xs font-semibold text-zinc-800">More course information</span>
            <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-zinc-500">
              View assessment, learning outcomes and the complete course record.
            </span>
          </span>
          <ExternalLink size={14} className="shrink-0 text-zinc-400" />
        </ButtonLink>

        <section className="mt-5 border-t border-zinc-100 pt-5">
          <h3 className="text-[13px] font-semibold text-zinc-900">Requisites</h3>

          <div className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-xl ring-1 ring-zinc-200">
            <div className="flex gap-3 p-3">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  prereqsMet ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
                )}
              >
                {prereqsMet ? <BookMarked size={17} /> : <AlertTriangle size={17} />}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-zinc-800">Prerequisite</p>
                <p className="mt-0.5 text-xs text-zinc-500">{course.prerequisiteText}</p>
                {course.prerequisiteCodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {course.prerequisiteCodes.map((code) => (
                      <span
                        key={code}
                        className={cn(
                          "rounded-md px-1.5 py-1 font-mono text-[10px] ring-1 ring-inset",
                          !missing.has(code)
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-rose-200",
                        )}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
                {!prereqsMet && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-2.5 py-2 text-rose-700 ring-1 ring-inset ring-rose-100">
                    <Info size={14} className="shrink-0" />
                    <p className="text-[11px] font-medium leading-snug">
                      {[...missing].join(" + ")} must be completed or planned earlier
                    </p>
                  </div>
                )}
              </div>
            </div>

            {course.incompatibilities.length > 0 && (
              <div className="flex gap-3 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
                  <X size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-800">Incompatible with</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {course.incompatibilities.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {course.permissionText && (
              <div className="flex gap-3 bg-brand-50/40 p-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    attempt.permissionApproved
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-brand-100 text-brand-600",
                  )}
                >
                  <ShieldCheck size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-800">Permission code</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{course.permissionText}</p>
                  <button
                    type="button"
                    className="mt-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                    onClick={() => {
                      togglePermission(attempt.id);
                      notify(
                        attempt.permissionApproved
                          ? "Permission removed"
                          : "Permission approval recorded",
                      );
                    }}
                  >
                    {attempt.permissionApproved ? "Remove approval" : "Record approval"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="border-t border-zinc-100 bg-white px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            disabled={attempt.status === "failed"}
            className={cn(
              attempt.status === "completed" &&
                "!bg-white !text-emerald-700 !ring-emerald-300 hover:!bg-emerald-50 disabled:opacity-100",
              attempt.status !== "completed" &&
                "hover:!bg-emerald-50 hover:!text-emerald-700 hover:!ring-emerald-200",
            )}
            onClick={() => {
              const nextStatus = attempt.status === "completed" ? "planned" : "completed";
              updateAttempt(attempt.id, nextStatus);
              notify(
                nextStatus === "completed"
                  ? `${course.code} marked as completed`
                  : `${course.code} marked as planned`,
              );
            }}
          >
            <Check size={14} />
            Completed
          </Button>
          <Button
            variant={attempt.status === "failed" ? "danger" : "secondary"}
            size="sm"
            fullWidth
            disabled={attempt.status === "completed"}
            className={cn(
              attempt.status === "failed" && "opacity-100",
              attempt.status !== "failed" &&
                "hover:!bg-rose-50 hover:!text-rose-700 hover:!ring-rose-200",
            )}
            onClick={() => {
              const nextStatus = attempt.status === "failed" ? "planned" : "failed";
              updateAttempt(attempt.id, nextStatus);
              notify(
                nextStatus === "failed"
                  ? `${course.code} recorded as a failed attempt`
                  : `${course.code} marked as planned`,
              );
            }}
          >
            <X size={14} />
            Failed
          </Button>
          <Button variant="danger" size="sm" fullWidth disabled={recorded} onClick={remove}>
            <Trash2 size={14} /> Remove
          </Button>
        </div>
      </footer>
    </Drawer>
  );
}
