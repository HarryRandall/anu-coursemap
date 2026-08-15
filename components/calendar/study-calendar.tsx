"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { CourseSidebar } from "@/components/calendar/course-sidebar";
import { SessionDrawer } from "@/components/calendar/session-drawer";
import { WeekGrid } from "@/components/calendar/week-grid";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  addDays,
  clampWeekToTerm,
  defaultWeekStart,
  formatWeekRange,
  resolveTermId,
  scheduledTerms,
  sessionsForAttempts,
  startOfWeek,
  termById,
  termWindow,
} from "@/lib/calendar";

export function StudyCalendar({
  requestedTermId,
}: {
  requestedTermId?: string;
}) {
  const { state } = useCoursemap();
  const router = useRouter();
  const pathname = usePathname();
  const plannedTermIds = useMemo(
    () =>
      scheduledTerms
        .filter((term) =>
          state.attempts.some(
            (attempt) =>
              attempt.termId === term.id && attempt.status !== "failed",
          ),
        )
        .map((term) => term.id),
    [state.attempts],
  );
  const [termId, setTermId] = useState(() =>
    resolveTermId(requestedTermId, plannedTermIds),
  );

  const setTerm = (nextTermId: string) => {
    setTermId(nextTermId);
    router.replace(`${pathname}?term=${nextTermId}`, { scroll: false });
  };

  return (
    <StudyCalendarBoard key={termId} termId={termId} onTermChange={setTerm} />
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-md text-zinc-500 transition hover:bg-white hover:text-zinc-900 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function StudyCalendarBoard({
  termId,
  onTermChange,
}: {
  termId: string;
  onTermChange: (termId: string) => void;
}) {
  const { state } = useCoursemap();
  const selectedTerm = termById(termId);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(termWindow(selectedTerm).start),
  );
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [hiddenCodes, setHiddenCodes] = useState<Set<string>>(new Set());
  const [highlightedCourseCode, setHighlightedCourseCode] = useState<
    string | null
  >(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const termAttempts = state.attempts.filter(
    (attempt) =>
      attempt.termId === selectedTerm.id && attempt.status !== "failed",
  );
  const allSessions = useMemo(
    () => sessionsForAttempts(state.attempts, selectedTerm.id),
    [state.attempts, selectedTerm.id],
  );
  const visibleSessions = allSessions.filter(
    (session) => !hiddenCodes.has(session.courseCode),
  );
  const selectedSession =
    allSessions.find((session) => session.id === selectedSessionId) ?? null;
  const teachingWindow = termWindow(selectedTerm);
  const canGoBack =
    weekStart.getTime() > startOfWeek(teachingWindow.start).getTime();
  const nextWeek = addDays(weekStart, 7);
  const clampedNext = clampWeekToTerm(nextWeek, selectedTerm);
  const canGoForward = clampedNext.getTime() !== weekStart.getTime();

  const selectSession = (sessionId: string) => {
    const session = allSessions.find((item) => item.id === sessionId);
    setSelectedSessionId(sessionId);
    setHighlightedCourseCode(session?.courseCode ?? null);
  };

  const toggleVisibility = (courseCode: string) => {
    setHiddenCodes((current) => {
      const next = new Set(current);
      if (next.has(courseCode)) next.delete(courseCode);
      else next.add(courseCode);
      return next;
    });
  };

  const highlightCourse = (courseCode: string) => {
    setHighlightedCourseCode((current) =>
      current === courseCode ? null : courseCode,
    );
    setSelectedSessionId(null);
  };

  const hasCourses = termAttempts.length > 0;

  return (
    <div className="mx-auto max-w-[92rem]">
      <h1 className="sr-only">Calendar</h1>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/70 bg-zinc-50/60 px-2.5 py-2.5">
          <button
            type="button"
            aria-pressed={coursesOpen}
            aria-label={
              coursesOpen ? "Collapse course list" : "Expand course list"
            }
            title={coursesOpen ? "Collapse course list" : "Expand course list"}
            onClick={() => setCoursesOpen((open) => !open)}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
              coursesOpen
                ? "bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200 ring-inset"
                : "text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-xs",
            )}
          >
            <PanelLeft size={17} />
          </button>

          <div className="w-[13.5rem]">
            <Select
              aria-label="Study period"
              value={selectedTerm.id}
              onChange={onTermChange}
              className="font-semibold"
              options={scheduledTerms.map((term) => ({
                value: term.id,
                label: `${term.name} ${term.year}`,
              }))}
            />
          </div>

          <p className="hidden text-[12px] text-zinc-400 md:block">
            {selectedTerm.dates}
          </p>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex items-center rounded-lg bg-zinc-100/90 p-0.5 ring-1 ring-zinc-200/70 ring-inset">
              <ToolbarButton
                label="Previous week"
                disabled={!canGoBack}
                onClick={() =>
                  setWeekStart(
                    clampWeekToTerm(addDays(weekStart, -7), selectedTerm),
                  )
                }
              >
                <ChevronLeft size={17} />
              </ToolbarButton>
              <p
                aria-live="polite"
                className="min-w-[9.75rem] px-1 text-center text-[13px] font-semibold text-zinc-800 tabular-nums"
              >
                {formatWeekRange(weekStart)}
              </p>
              <ToolbarButton
                label="Next week"
                disabled={!canGoForward}
                onClick={() => setWeekStart(clampedNext)}
              >
                <ChevronRight size={17} />
              </ToolbarButton>
            </div>
            <button
              type="button"
              onClick={() => setWeekStart(defaultWeekStart(selectedTerm))}
              className="h-10 rounded-lg px-3 text-[13px] font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-900 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
            >
              This week
            </button>
          </div>
        </div>

        <div className="flex items-stretch">
          <aside
            aria-label="Courses"
            className={cn(
              "shrink-0 border-r border-zinc-200/70 transition-[width] duration-200",
              coursesOpen ? "w-[17.5rem]" : "w-[4.25rem]",
            )}
          >
            {hasCourses ? (
              <CourseSidebar
                attempts={termAttempts}
                allAttempts={state.attempts}
                sessions={allSessions}
                collapsed={!coursesOpen}
                hiddenCodes={hiddenCodes}
                highlightedCourseCode={highlightedCourseCode}
                selectedSessionId={selectedSessionId}
                onHighlightCourse={highlightCourse}
                onSelectSession={selectSession}
                onToggleVisibility={toggleVisibility}
              />
            ) : (
              coursesOpen && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-zinc-700">
                    Nothing planned yet
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Add a course to this study period.
                  </p>
                  <ButtonLink href="/plan" size="sm" className="mt-3">
                    Open plan
                  </ButtonLink>
                </div>
              )
            )}
          </aside>

          <div className="min-w-0 flex-1 overflow-x-auto">
            {hasCourses ? (
              <WeekGrid
                weekStart={weekStart}
                sessions={visibleSessions}
                selectedSessionId={selectedSessionId}
                highlightedCourseCode={highlightedCourseCode}
                onSelect={selectSession}
              />
            ) : (
              <div className="px-5 py-20 text-center">
                <CalendarDays className="mx-auto text-zinc-300" size={28} />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  No classes to show yet
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Planned courses appear here as a weekly timetable.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {selectedSession && (
        <SessionDrawer
          session={selectedSession}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
