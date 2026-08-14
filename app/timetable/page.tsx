"use client";

import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { accent } from "@/lib/ui";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { courseByCode, terms, type Course } from "@/lib/catalogue";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const rooms = ["Hancock Lab 2", "Copland G31", "Marie Reay 4.02", "Kambri T1", "Birch 1.14"];
const startHour = 8;
const endHour = 18;
const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);

type Session = {
  course: Course;
  kind: "Lecture" | "Tutorial";
  day: number;
  start: number;
  end: number;
  room: string;
};

function seedOf(code: string) {
  return code.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function sessionsFor(course: Course): Session[] {
  const seed = seedOf(course.code);
  const lectureStart = 9 + (seed % 4);
  const tutorialStart = 13 + (seed % 3);
  return [
    {
      course,
      kind: "Lecture",
      day: seed % 5,
      start: lectureStart,
      end: lectureStart + 2,
      room: rooms[seed % rooms.length],
    },
    {
      course,
      kind: "Tutorial",
      day: (seed + 2) % 5,
      start: tutorialStart,
      end: tutorialStart + 1,
      room: rooms[(seed + 1) % rooms.length],
    },
  ];
}

function formatHour(hour: number) {
  const period = hour < 12 ? "am" : "pm";
  const value = hour % 12 === 0 ? 12 : hour % 12;
  return `${value}${period}`;
}

export default function TimetablePage() {
  const { state } = useCoursemap();
  const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");
  const defaultTerm =
    scheduledTerms.find((term) =>
      state.attempts.some(
        (attempt) => attempt.termId === term.id && attempt.status !== "failed",
      ),
    )?.id ?? scheduledTerms[0].id;
  const [termId, setTermId] = useState(defaultTerm);
  const term = terms.find((item) => item.id === termId) ?? terms[0];

  const sessions = useMemo(() => {
    const termCourses = state.attempts
      .filter((attempt) => attempt.termId === termId && attempt.status !== "failed")
      .map((attempt) => courseByCode(attempt.courseCode))
      .filter((course): course is Course => Boolean(course));
    const unique = [...new Map(termCourses.map((course) => [course.code, course])).values()];
    return unique.flatMap(sessionsFor);
  }, [state.attempts, termId]);

  const contactHours = sessions.reduce((total, session) => total + (session.end - session.start), 0);

  return (
    <AppShell title="Timetable" subtitle="Weekly class schedule">
      <h1 className="sr-only">Timetable</h1>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">
            <CalendarDays size={12} /> {sessions.length} classes
          </Badge>
          <Badge tone="neutral">
            <Clock3 size={12} /> {contactHours} contact hours / week
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-500">Semester</span>
          <Select
            aria-label="Timetable semester"
            value={termId}
            onChange={setTermId}
            options={scheduledTerms.map((item) => ({
              value: item.id,
              label: `${item.name} ${item.year}`,
            }))}
            className="w-44"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">
              {term.name} {term.year}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">Indicative lecture and tutorial pattern · {term.dates}</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-5 py-16 text-center">
            <CalendarDays size={26} className="text-zinc-300" />
            <p className="mt-2 text-sm font-medium text-zinc-700">No classes this semester</p>
            <p className="text-xs text-zinc-400">Add courses to this semester from your plan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <div className="min-w-[720px]">
              {/* Day header */}
              <div className="grid grid-cols-[3.5rem_repeat(5,minmax(0,1fr))] gap-2">
                <div />
                {days.map((day) => (
                  <div
                    key={day}
                    className="pb-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid body */}
              <div
                className="relative grid gap-2"
                style={{
                  gridTemplateColumns: "3.5rem repeat(5, minmax(0, 1fr))",
                  gridTemplateRows: `repeat(${hours.length}, 3.25rem)`,
                }}
              >
                {/* Time labels + slot lines */}
                {hours.map((hour, rowIndex) => (
                  <div
                    key={hour}
                    className="-mt-2 text-right text-[10px] text-zinc-400"
                    style={{ gridColumn: 1, gridRow: rowIndex + 1 }}
                  >
                    {formatHour(hour)}
                  </div>
                ))}
                {hours.map((hour, rowIndex) =>
                  days.map((_, colIndex) => (
                    <div
                      key={`${hour}-${colIndex}`}
                      className="rounded-lg border border-zinc-100"
                      style={{ gridColumn: colIndex + 2, gridRow: rowIndex + 1 }}
                    />
                  )),
                )}

                {/* Sessions */}
                {sessions.map((session, index) => (
                  <div
                    key={index}
                    style={{
                      gridColumn: session.day + 2,
                      gridRow: `${session.start - startHour + 1} / ${session.end - startHour + 1}`,
                    }}
                    className={cn(
                      "z-10 m-0.5 flex flex-col justify-between overflow-hidden rounded-lg p-2 ring-1 ring-inset",
                      accent[session.course.accent].token,
                      accent[session.course.accent].ring,
                    )}
                  >
                    <div>
                      <p className="font-mono text-[10px] font-bold">{session.course.code}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-tight opacity-90">
                        {session.kind}
                      </p>
                    </div>
                    <p className="flex items-center gap-1 text-[9px] opacity-70">
                      <MapPin size={9} /> {session.room}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
