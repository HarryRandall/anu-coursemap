"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { CourseSidebar } from "@/components/calendar/course-sidebar";
import { SessionDrawer } from "@/components/calendar/session-drawer";
import { WeekGrid } from "@/components/calendar/week-grid";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
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
  termIdFromParts,
  termWindow,
  uniqueTermYears,
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
  const [coursesOpen, setCoursesOpen] = useState(true);
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

  return (
    <div className="mx-auto max-w-[92rem]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-600">
            Weekly study timetable
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Your study calendar
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Filter by year and semester, then select a class to inspect its
            illustrative lecture, tutorial or laboratory time.
          </p>
        </div>
        <ButtonLink href="/plan" variant="secondary" size="sm">
          Edit plan
        </ButtonLink>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Year" className="w-[8.5rem]">
            <Select
              aria-label="Calendar year"
              value={selectedTerm.year}
              onChange={(year) =>
                onTermChange(termIdFromParts(year, selectedTerm.shortName))
              }
              options={uniqueTermYears().map((year) => ({
                value: year,
                label: String(year),
              }))}
            />
          </Field>
          <Field label="Semester" className="w-[12.5rem]">
            <Select
              aria-label="Semester"
              value={selectedTerm.shortName}
              onChange={(shortName) =>
                onTermChange(termIdFromParts(selectedTerm.year, shortName))
              }
              options={[
                { value: "S1", label: "Semester 1" },
                { value: "S2", label: "Semester 2" },
              ]}
            />
          </Field>
          <Badge tone="brand" className="mb-1.5">
            {termAttempts.length}{" "}
            {termAttempts.length === 1 ? "course" : "courses"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            label="Previous week"
            className="size-11"
            disabled={!canGoBack}
            onClick={() =>
              setWeekStart(
                clampWeekToTerm(addDays(weekStart, -7), selectedTerm),
              )
            }
          >
            <ChevronLeft size={18} />
          </IconButton>
          <p className="min-w-[10.5rem] text-center text-sm font-semibold text-zinc-800">
            {formatWeekRange(weekStart)}
          </p>
          <IconButton
            label="Next week"
            className="size-11"
            disabled={!canGoForward}
            onClick={() => setWeekStart(clampedNext)}
          >
            <ChevronRight size={18} />
          </IconButton>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => setWeekStart(defaultWeekStart(selectedTerm))}
          >
            This week
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 grid items-start gap-4",
          coursesOpen
            ? "lg:grid-cols-[19rem_minmax(0,1fr)]"
            : "lg:grid-cols-[4.5rem_minmax(0,1fr)]",
        )}
      >
        <Card className="overflow-hidden lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            {coursesOpen ? (
              <div className="flex min-w-0 items-center gap-2.5 px-1">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <CalendarDays size={17} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Courses
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    {selectedTerm.name} {selectedTerm.year}
                  </p>
                </div>
              </div>
            ) : (
              <span className="sr-only">Courses</span>
            )}
            <IconButton
              label={
                coursesOpen ? "Collapse course list" : "Expand course list"
              }
              className="size-11"
              onClick={() => setCoursesOpen((open) => !open)}
            >
              {coursesOpen ? (
                <PanelLeftClose size={18} />
              ) : (
                <PanelLeftOpen size={18} />
              )}
            </IconButton>
          </div>
          {termAttempts.length === 0 ? (
            <div className="border-t border-zinc-100 px-4 py-10 text-center">
              <p className="text-sm font-medium text-zinc-700">
                Nothing planned for this study period
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Add a course or move one here from your plan.
              </p>
              <ButtonLink href="/plan" size="sm" className="mt-4">
                Open plan
              </ButtonLink>
            </div>
          ) : (
            <div className="border-t border-zinc-100">
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
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                {selectedTerm.name} {selectedTerm.year}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {selectedTerm.dates} · select a class to view details
              </p>
            </div>
            <Badge tone="neutral">Illustrative times</Badge>
          </div>
          <div className="overflow-x-auto bg-[linear-gradient(180deg,#fafafa,white_48px)]">
            {termAttempts.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <CalendarDays className="mx-auto text-zinc-300" size={28} />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  No classes to show yet
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Planned courses appear here as a weekly timetable.
                </p>
              </div>
            ) : (
              <WeekGrid
                weekStart={weekStart}
                sessions={visibleSessions}
                selectedSessionId={selectedSessionId}
                highlightedCourseCode={highlightedCourseCode}
                onSelect={selectSession}
              />
            )}
          </div>
        </Card>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
        Class times and rooms are illustrative samples for planning, not the
        official ANU timetable. Confirm teaching dates, class times and
        locations with ANU before relying on them.
      </p>

      {selectedSession && (
        <SessionDrawer
          session={selectedSession}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
