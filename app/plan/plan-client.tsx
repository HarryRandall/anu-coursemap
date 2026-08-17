"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  GripVertical,
  Plus,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { CourseDrawer, CoursePicker } from "@/components/overlays";
import { DegreeProgressBar } from "@/components/plan/degree-progress-bar";
import { FixIssueButton } from "@/components/plan/fix-issue-button";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import type { Attempt, Course, Term } from "@/lib/coursemap/types";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  STANDARD_COURSE_SLOTS,
  degreeUnitProgress,
  effectiveStatus,
  missingPrereqs,
  planningCourseByCode,
  recommendedCoursesForTerm,
  type EffectiveStatus,
} from "@/lib/planner";

type Entry = { attempt: Attempt; course: Course; status: EffectiveStatus };
type PendingDrop = {
  attemptId: string;
  termId: string;
  beforeAttemptId?: string;
};
type DragPointer = {
  initialX: number;
  initialY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  rowHeight: number;
};
type PickerState = { termId: string; intent: "all" | "recommended" };

export function PlanClient({ catalogue }: { catalogue: PlanCatalogue }) {
  return <PlanBoard catalogue={catalogue} />;
}

/** Single muted status mark - the only colour on the board. */
function StatusMark({
  status,
  size = 15,
}: {
  status: EffectiveStatus;
  size?: number;
}) {
  if (status === "completed")
    return <CheckCircle2 size={size} className="shrink-0 text-emerald-500" />;
  if (status === "failed")
    return <XCircle size={size} className="shrink-0 text-rose-500" />;
  if (status === "blocked" || status === "approval")
    return <AlertTriangle size={size} className="shrink-0 text-amber-500" />;
  return <Circle size={size} className="shrink-0 text-zinc-300" />;
}

function PlanBoard({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state, addCourse, reorderAttempt, notify } = useCoursemap();
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [overloadTerm, setOverloadTerm] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<PendingDrop | null>(null);
  const [dragPointer, setDragPointer] = useState<DragPointer | null>(null);
  const dragPreviewRef = useRef<PendingDrop | null>(null);
  const floatingCardRef = useRef<HTMLDivElement | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);

  const scheduledYears = useMemo(
    () =>
      [
        ...new Set(
          catalogue.terms
            .filter((term) => term.id !== "unscheduled")
            .map((term) => term.year),
        ),
      ].map((year) => ({
        year,
        terms: catalogue.terms.filter(
          (term) => term.year === year && term.id !== "unscheduled",
        ),
      })),
    [catalogue.terms],
  );
  const unscheduled = catalogue.terms.find((term) => term.id === "unscheduled");
  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const major = catalogue.majors.find(
    (item) => item.code === state.profile.majorCode,
  );
  const progress = degreeUnitProgress(
    state.attempts,
    degree?.units ?? 0,
    catalogue,
  );
  const degreeYears = degree
    ? Array.from(
        { length: Math.max(1, Math.ceil(degree.duration)) },
        (_, index) => ({
          studyYear: index + 1,
          year: state.profile.commencementYear + index,
        }),
      )
    : [];

  useEffect(
    () => () => {
      pointerCleanupRef.current?.();
    },
    [],
  );

  const entriesFor = (termId: string): Entry[] =>
    state.attempts
      .filter((attempt) => attempt.termId === termId)
      .map((attempt) => {
        const course = planningCourseByCode(attempt.courseCode, catalogue);
        return course
          ? {
              attempt,
              course,
              status: effectiveStatus(attempt, state.attempts, catalogue),
            }
          : null;
      })
      .filter((entry): entry is Entry => Boolean(entry));

  const unitsOf = (entries: Entry[]) =>
    entries.reduce(
      (total, entry) =>
        total + (entry.status === "failed" ? 0 : entry.course.units),
      0,
    );

  const issueNote = (entry: Entry) => {
    if (entry.status === "blocked") {
      const missing = missingPrereqs(entry.attempt, state.attempts, catalogue);
      return `Needs ${missing.join(" + ")} completed or scheduled earlier`;
    }
    if (entry.status === "approval") return "Convener permission is required";
    if (entry.status === "failed") return "Failed attempt with 0 units earned";
    return null;
  };

  const applyDrop = async ({
    attemptId,
    termId,
    beforeAttemptId,
  }: PendingDrop) => {
    const attempt = state.attempts.find((item) => item.id === attemptId);
    if (!attempt || attemptId === beforeAttemptId) return;
    const originalTermId = attempt.termId;
    const result = await reorderAttempt(attemptId, termId, beforeAttemptId);
    const term = catalogue.terms.find((item) => item.id === termId);
    notify(
      result.ok
        ? originalTermId === termId
          ? `${attempt.courseCode} reordered in ${term?.name} ${term?.year ?? ""}`
          : `${attempt.courseCode} moved to ${term?.name} ${term?.year ?? ""}`
        : result.message,
      result.ok ? "success" : "warning",
    );
  };

  const requestDrop = (drop: PendingDrop) => {
    const attempt = state.attempts.find((item) => item.id === drop.attemptId);
    const course = attempt
      ? planningCourseByCode(attempt.courseCode, catalogue)
      : undefined;
    if (!attempt || !course || drop.attemptId === drop.beforeAttemptId) return;

    if (attempt.termId === drop.termId) return;

    if (attempt.status === "completed" || attempt.status === "failed") {
      notify(
        `${attempt.courseCode} is recorded and cannot move to another semester`,
        "warning",
      );
      return;
    }

    const destination = entriesFor(drop.termId).filter(
      (entry) => entry.attempt.id !== drop.attemptId,
    );
    const nextUnits = unitsOf(destination) + course.units;
    if (
      drop.termId !== "unscheduled" &&
      (destination.length + 1 > STANDARD_COURSE_SLOTS || nextUnits > 24)
    ) {
      setPendingDrop(drop);
      setOverloadTerm(drop.termId);
      return;
    }

    applyDrop(drop);
  };

  const requestAddCourse = (
    term: Term,
    intent: "all" | "recommended" = "all",
  ) => {
    const entries = entriesFor(term.id);
    if (
      term.id !== "unscheduled" &&
      (entries.length >= STANDARD_COURSE_SLOTS || unitsOf(entries) >= 24)
    ) {
      setPendingDrop(null);
      setOverloadTerm(term.id);
      return;
    }
    setPicker({ termId: term.id, intent });
  };

  const addRecommendedCourse = async (term: Term, course: Course) => {
    const entries = entriesFor(term.id);
    if (
      term.id !== "unscheduled" &&
      (entries.length >= STANDARD_COURSE_SLOTS || unitsOf(entries) >= 24)
    ) {
      setPendingDrop(null);
      setOverloadTerm(term.id);
      return;
    }
    const result = await addCourse(course.code, term.id);
    notify(
      result.ok
        ? `${course.code} added to ${term.name} ${term.year}`
        : result.message,
      result.ok ? "success" : "warning",
    );
  };

  const previewDrop = (drop: PendingDrop) => {
    dragPreviewRef.current = drop;
    setDragPreview((current) =>
      current?.attemptId === drop.attemptId &&
      current.termId === drop.termId &&
      current.beforeAttemptId === drop.beforeAttemptId
        ? current
        : drop,
    );
  };

  const finishPointerDrag = (cancelled = false) => {
    const drop = dragPreviewRef.current;
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
    dragPreviewRef.current = null;
    setDragPointer(null);
    setDragging(null);
    setDragPreview(null);
    if (!cancelled && drop) requestDrop(drop);
  };

  const startPointerDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    entry: Entry,
    term: Term,
  ) => {
    if (event.button !== 0 || pointerCleanupRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest<HTMLElement>("[data-attempt-id]");
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const initialDrop = {
      attemptId: entry.attempt.id,
      termId: term.id,
    };

    setDragging(entry.attempt.id);
    previewDrop(initialDrop);
    setDragPointer({
      initialX: event.clientX,
      initialY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      rowHeight: rect.height,
    });

    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      if (floatingCardRef.current) {
        floatingCardRef.current.style.transform = `translate3d(${moveEvent.clientX - (event.clientX - rect.left)}px, ${moveEvent.clientY - (event.clientY - rect.top)}px, 0)`;
      }

      if (moveEvent.clientY < 72)
        window.scrollBy({ top: -12, behavior: "auto" });
      if (moveEvent.clientY > window.innerHeight - 72) {
        window.scrollBy({ top: 12, behavior: "auto" });
      }

      const target = document.elementFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
      );
      const lane = target?.closest<HTMLElement>("[data-drop-term]");
      const termId = lane?.dataset.dropTerm;
      if (!lane || !termId) return;

      previewDrop({ attemptId: entry.attempt.id, termId });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === event.pointerId) finishPointerDrag();
    };
    const onPointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === event.pointerId) finishPointerDrag(true);
    };
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") finishPointerDrag(true);
    };

    pointerCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
  };

  const renderLane = (term: Term) => {
    const entries = entriesFor(term.id);
    const units = unitsOf(entries);
    const previewAttempt = dragging
      ? state.attempts.find((attempt) => attempt.id === dragging)
      : undefined;
    const previewCourse = previewAttempt
      ? planningCourseByCode(previewAttempt.courseCode, catalogue)
      : undefined;
    const previewEntry =
      previewAttempt && previewCourse
        ? {
            attempt: previewAttempt,
            course: previewCourse,
            status: effectiveStatus(previewAttempt, state.attempts, catalogue),
          }
        : undefined;
    const previewApplies = Boolean(
      previewEntry && dragPreview?.termId === term.id,
    );
    const containsDragged = Boolean(
      dragging && entries.some((entry) => entry.attempt.id === dragging),
    );
    const previewUsesEmptySlot = Boolean(
      previewApplies &&
      !containsDragged &&
      (term.id === "unscheduled" || entries.length < STANDARD_COURSE_SLOTS),
    );
    const emptySlots =
      term.id === "unscheduled"
        ? entries.length === 0 && !previewUsesEmptySlot
          ? 1
          : 0
        : Math.max(
            0,
            STANDARD_COURSE_SLOTS -
              entries.length -
              Number(previewUsesEmptySlot),
          );
    const recommended = recommendedCoursesForTerm(
      term,
      state.attempts,
      major?.courseCodes ?? [],
      catalogue,
    );
    const suggested = emptySlots > 0 ? recommended[0] : undefined;
    const remainingEmpty = suggested ? emptySlots - 1 : emptySlots;

    const dropPreview = previewEntry ? (
      <div
        key={`drop-preview-${previewEntry.attempt.id}-${term.id}`}
        aria-hidden="true"
        className="pointer-events-none flex min-h-[52px] origin-top animate-drop-slot-in items-center gap-2.5 rounded-lg bg-brand-50/70 px-2 py-2 text-left ring-1 ring-brand-200 ring-inset"
      >
        <GripVertical size={13} className="shrink-0 text-brand-300" />
        <StatusMark status={previewEntry.status} />
        <span className="w-[4.75rem] shrink-0 font-mono text-[11px] text-brand-600">
          {previewEntry.course.code}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
          {previewEntry.course.name}
        </span>
        <span className="shrink-0 text-[11px] text-zinc-400">
          {previewEntry.course.units}u
        </span>
      </div>
    ) : null;

    return (
      <div
        key={term.id}
        data-testid={`term-${term.id}`}
        data-drop-term={term.id}
        className={cn(
          "flex min-h-44 flex-col rounded-xl bg-white p-2.5 ring-1 transition",
          dragging && dragPreview?.termId === term.id
            ? "ring-2 ring-brand-300"
            : "ring-zinc-200",
        )}
      >
        <header className="flex items-center justify-between gap-2 px-1 pb-2">
          <p className="text-[13px] font-semibold text-zinc-900">
            {term.name}
            <span className="ml-2 font-normal text-zinc-400">{term.dates}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[11px] font-medium",
                units > 24 ? "text-amber-600" : "text-zinc-400",
              )}
            >
              {term.id === "unscheduled"
                ? `${units} units`
                : `${units} / 24 units`}
              {units > 24 && " · Overload"}
            </span>
            {recommended.length > 0 && (
              <button
                type="button"
                onClick={() => requestAddCourse(term, "recommended")}
                aria-label={`Add a recommended course to ${term.name} ${term.year}`}
                className="grid size-8 place-items-center rounded-md text-brand-600 transition hover:bg-brand-50"
              >
                <Sparkles size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => requestAddCourse(term)}
              aria-label={`Add a course to ${term.name} ${term.year}`}
              className="grid size-8 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <Plus size={14} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-1">
          {entries.map((entry) => {
            const note = issueNote(entry);
            if (dragging === entry.attempt.id) {
              return (
                <div
                  key={entry.attempt.id}
                  aria-hidden="true"
                  className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 px-2 text-[11px] font-medium text-zinc-400"
                  style={{ height: dragPointer?.rowHeight }}
                >
                  <span className="grid size-[15px] shrink-0 place-items-center rounded-full border border-zinc-200 bg-white">
                    <Plus size={10} />
                  </span>
                  <span>Add course</span>
                </div>
              );
            }
            return (
              <div
                key={entry.attempt.id}
                data-attempt-id={entry.attempt.id}
                className="group relative grid min-h-[52px] grid-cols-[1.75rem_minmax(0,1fr)] rounded-lg transition-colors hover:bg-zinc-50"
              >
                <button
                  type="button"
                  aria-label={`Reorder ${entry.course.code}`}
                  onPointerDown={(event) =>
                    startPointerDrag(event, entry, term)
                  }
                  className="grid cursor-grab touch-none place-items-center rounded-l-lg text-zinc-200 transition hover:text-zinc-500 active:cursor-grabbing"
                >
                  <GripVertical size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(entry.attempt.id)}
                  aria-describedby={
                    note ? `course-issue-${entry.attempt.id}` : undefined
                  }
                  className="min-w-0 py-2 pr-2 text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <StatusMark status={entry.status} />
                    <span className="w-[4.75rem] shrink-0 font-mono text-[11px] text-zinc-500">
                      {entry.course.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
                      {entry.course.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {entry.course.units}u
                    </span>
                  </span>
                </button>
                {entry.status === "blocked" && (
                  <div className="col-span-2 flex justify-end px-2 pb-2">
                    <FixIssueButton
                      attempt={entry.attempt}
                      catalogue={catalogue}
                    />
                  </div>
                )}
                {note && (
                  <span
                    id={`course-issue-${entry.attempt.id}`}
                    role="tooltip"
                    className="pointer-events-none invisible absolute top-[calc(100%+0.25rem)] left-8 z-40 max-w-72 translate-y-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] leading-relaxed font-medium text-white opacity-0 shadow-lg transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    {note}
                  </span>
                )}
              </div>
            );
          })}
          {previewUsesEmptySlot && dropPreview}
          {suggested && (
            <button
              type="button"
              onClick={() => void addRecommendedCourse(term, suggested)}
              aria-label={`Add recommended course ${suggested.code} to ${term.name} ${term.year}`}
              className="group flex min-h-[52px] items-center gap-2 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 px-2 text-left text-[11px] font-medium text-brand-800 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="grid size-[15px] shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-brand-600">
                <Sparkles size={10} aria-hidden="true" />
              </span>
              <span className="w-[4.75rem] shrink-0 font-mono">
                {suggested.code}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                {suggested.name}
              </span>
              <span className="shrink-0 text-[10px] font-semibold tracking-wide text-brand-600 uppercase">
                Recommended
              </span>
            </button>
          )}
          {Array.from({ length: remainingEmpty }, (_, index) => (
            <button
              key={`${term.id}-empty-${index}`}
              type="button"
              onClick={() => requestAddCourse(term)}
              aria-label={
                term.id === "unscheduled"
                  ? "Add an unscheduled course"
                  : `Add course in empty slot ${entries.length + index + 1 + Number(Boolean(suggested))} of ${STANDARD_COURSE_SLOTS} for ${term.name} ${term.year}`
              }
              className="group flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 px-2 text-[11px] font-medium text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600"
            >
              <span className="grid size-[15px] shrink-0 place-items-center rounded-full border border-zinc-200 bg-white transition group-hover:border-zinc-300">
                <Plus size={10} />
              </span>
              <span>Add course</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const overloadTarget = overloadTerm
    ? catalogue.terms.find((term) => term.id === overloadTerm)
    : undefined;
  const draggedAttempt = dragging
    ? state.attempts.find((attempt) => attempt.id === dragging)
    : undefined;
  const draggedCourse = draggedAttempt
    ? planningCourseByCode(draggedAttempt.courseCode, catalogue)
    : undefined;
  const draggedStatus = draggedAttempt
    ? effectiveStatus(draggedAttempt, state.attempts, catalogue)
    : undefined;

  return (
    <AppShell>
      <section aria-label="Course plan" className="year-board">
        <div className="mb-4 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-zinc-200/70 sm:px-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                Degree progress
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                {degree
                  ? `${progress.percent}% of units completed`
                  : `${progress.completed} units completed`}
              </p>
            </div>
            <div
              className="flex gap-4 text-[11px] text-zinc-500"
              aria-label="Course statuses"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-500" />{" "}
                Completed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Circle size={12} className="text-zinc-300" /> Planned
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500" /> Needs
                attention
              </span>
            </div>
          </div>
          {degree ? (
            <DegreeProgressBar progress={progress} compact />
          ) : (
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              Programme requirements and your completion target are not imported
              yet.
            </p>
          )}
          {degree && !catalogue.programmeRequirementsImported && (
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              Programme requirements are not imported yet, so course
              recommendations are unknown.
            </p>
          )}
          {degreeYears.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
                Degree timeline
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {degreeYears.map((item) => {
                  const calendarImported = scheduledYears.some(
                    (yearGroup) => yearGroup.year === item.year,
                  );
                  return (
                    <span
                      key={item.studyYear}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset",
                        calendarImported
                          ? "bg-brand-50 text-brand-800 ring-brand-100"
                          : "bg-zinc-50 text-zinc-500 ring-zinc-200",
                      )}
                    >
                      Year {item.studyYear} · {item.year}
                      {!calendarImported && " · calendar pending"}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div data-testid="roadmap-board" className="flex flex-col gap-5">
          {scheduledYears.map((yearGroup) => {
            const yearEntries = yearGroup.terms.flatMap((term) =>
              entriesFor(term.id),
            );
            return (
              <section className="year-row" key={yearGroup.year}>
                <div className="mb-2 flex items-end justify-between px-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Year{" "}
                      {Math.max(
                        1,
                        yearGroup.year - state.profile.commencementYear + 1,
                      )}
                    </h2>
                    <span className="text-xs text-zinc-400">
                      {yearGroup.year}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {unitsOf(yearEntries)} units
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {yearGroup.terms.map(renderLane)}
                </div>
              </section>
            );
          })}

          {unscheduled && (
            <section>
              <h2 className="mb-2 px-1 text-sm font-semibold text-zinc-900">
                Later
              </h2>
              {renderLane(unscheduled)}
            </section>
          )}
        </div>
      </section>

      {dragPointer && draggedCourse && draggedStatus && (
        <div className="pointer-events-none fixed inset-0 z-[120] cursor-grabbing select-none">
          <div
            ref={floatingCardRef}
            aria-hidden="true"
            className="absolute top-0 left-0 flex min-h-[52px] items-center gap-2.5 rounded-lg bg-white px-2 py-2 text-left opacity-95 shadow-lg ring-1 ring-zinc-200 will-change-transform"
            style={{
              width: dragPointer.width,
              transform: `translate3d(${dragPointer.initialX - dragPointer.offsetX}px, ${dragPointer.initialY - dragPointer.offsetY}px, 0)`,
            }}
          >
            <GripVertical size={13} className="shrink-0 text-zinc-400" />
            <StatusMark status={draggedStatus} />
            <span className="w-[4.75rem] shrink-0 font-mono text-[11px] text-zinc-500">
              {draggedCourse.code}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
              {draggedCourse.name}
            </span>
            <span className="shrink-0 text-[11px] text-zinc-400">
              {draggedCourse.units}u
            </span>
          </div>
        </div>
      )}

      {picker && (
        <CoursePicker
          termId={picker.termId}
          intent={picker.intent}
          catalogue={catalogue}
          onClose={() => setPicker(null)}
        />
      )}
      {overloadTarget && (
        <Modal
          onClose={() => {
            setOverloadTerm(null);
            setPendingDrop(null);
          }}
          labelledBy="overload-warning-title"
          className="max-w-md"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200 ring-inset">
                <AlertTriangle size={19} />
              </span>
              <h2
                id="overload-warning-title"
                className="text-lg font-bold tracking-tight text-zinc-900"
              >
                This semester is already full
              </h2>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
              {pendingDrop
                ? `Moving this course to ${overloadTarget.name} ${overloadTarget.year} would exceed the standard four-course, 24-unit study load.`
                : `Adding another course would take ${overloadTarget.name} ${overloadTarget.year} above the standard four-course, 24-unit study load.`}{" "}
              Overloading may require approval.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5">
            <Button variant="secondary" onClick={() => setOverloadTerm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pendingDrop) {
                  applyDrop(pendingDrop);
                } else {
                  setPicker({ termId: overloadTarget.id, intent: "all" });
                }
                setOverloadTerm(null);
                setPendingDrop(null);
              }}
            >
              {pendingDrop ? "Move anyway" : "Continue to courses"}
            </Button>
          </div>
        </Modal>
      )}
      {selectedAttempt && (
        <CourseDrawer
          attemptId={selectedAttempt}
          catalogue={catalogue}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </AppShell>
  );
}
