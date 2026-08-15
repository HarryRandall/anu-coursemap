import {
  courseByCode,
  terms,
  type Accent,
  type Attempt,
  type Term,
} from "@/lib/catalogue";

export const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4;

export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 18;
export const HOUR_COUNT = DAY_END_HOUR - DAY_START_HOUR;
export const HOUR_HEIGHT_PX = 72;

export type SessionKind = "lecture" | "tutorial" | "laboratory" | "workshop";

export type ClassSession = {
  id: string;
  courseCode: string;
  courseName: string;
  accent: Accent;
  kind: SessionKind;
  weekday: WeekdayIndex;
  startMinutes: number;
  durationMinutes: number;
  location: string;
};

type SessionTemplate = {
  weekday: WeekdayIndex;
  startHour: number;
  durationHours: number;
  kind: SessionKind;
  location: string;
};

const sessionTemplates: Record<string, SessionTemplate[]> = {
  COMP1100: [
    {
      weekday: 0,
      startHour: 9,
      durationHours: 2,
      kind: "lecture",
      location: "Hanna Neumann G053",
    },
    {
      weekday: 2,
      startHour: 14,
      durationHours: 2,
      kind: "laboratory",
      location: "CSIT N113",
    },
    {
      weekday: 3,
      startHour: 11,
      durationHours: 1,
      kind: "tutorial",
      location: "Hanna Neumann 1.33",
    },
  ],
  MATH1005: [
    {
      weekday: 1,
      startHour: 10,
      durationHours: 2,
      kind: "lecture",
      location: "Manning Clark T2",
    },
    {
      weekday: 4,
      startHour: 9,
      durationHours: 1,
      kind: "tutorial",
      location: "Hanna Neumann 2.21",
    },
  ],
  COMP1110: [
    {
      weekday: 1,
      startHour: 9,
      durationHours: 2,
      kind: "lecture",
      location: "CSIT N101",
    },
    {
      weekday: 3,
      startHour: 14,
      durationHours: 2,
      kind: "laboratory",
      location: "CSIT N114",
    },
    {
      weekday: 4,
      startHour: 11,
      durationHours: 1,
      kind: "tutorial",
      location: "Hanna Neumann 1.24",
    },
  ],
  COMP1600: [
    {
      weekday: 0,
      startHour: 14,
      durationHours: 2,
      kind: "lecture",
      location: "Ian Ross Seminar",
    },
    {
      weekday: 2,
      startHour: 9,
      durationHours: 1,
      kind: "tutorial",
      location: "Robertson 1.02",
    },
  ],
  COMP2100: [
    {
      weekday: 0,
      startHour: 11,
      durationHours: 2,
      kind: "lecture",
      location: "CSIT N101",
    },
    {
      weekday: 2,
      startHour: 15,
      durationHours: 2,
      kind: "laboratory",
      location: "CSIT N113",
    },
  ],
  COMP2120: [
    {
      weekday: 1,
      startHour: 14,
      durationHours: 2,
      kind: "lecture",
      location: "Ian Ross Lecture",
    },
    {
      weekday: 3,
      startHour: 9,
      durationHours: 2,
      kind: "laboratory",
      location: "CSIT N115",
    },
  ],
  COMP3900: [
    {
      weekday: 2,
      startHour: 10,
      durationHours: 2,
      kind: "workshop",
      location: "CSIT N101",
    },
    {
      weekday: 4,
      startHour: 14,
      durationHours: 2,
      kind: "workshop",
      location: "CSIT N101",
    },
  ],
};

const generatedLocations = [
  "CSIT N101",
  "CSIT N113",
  "Hanna Neumann G053",
  "Hanna Neumann 1.24",
  "Ian Ross Seminar",
  "Robertson 1.02",
  "Manning Clark T2",
  "Manning Clark T5",
];

export const sessionKindLabel: Record<SessionKind, string> = {
  lecture: "Lecture",
  tutorial: "Tutorial",
  laboratory: "Laboratory",
  workshop: "Workshop",
};

export const sessionKindShort: Record<SessionKind, string> = {
  lecture: "Lec",
  tutorial: "Tut",
  laboratory: "Lab",
  workshop: "Wks",
};

export function termById(termId: string): Term {
  return scheduledTerms.find((term) => term.id === termId) ?? scheduledTerms[0];
}

export function uniqueTermYears() {
  return [...new Set(scheduledTerms.map((term) => term.year))];
}

export function resolveTermId(
  requested: string | null | undefined,
  plannedTermIds: string[],
) {
  if (requested && scheduledTerms.some((term) => term.id === requested)) {
    return requested;
  }
  return plannedTermIds[0] ?? scheduledTerms[0].id;
}

export function termIdFromParts(year: number, shortName: string) {
  const match = scheduledTerms.find(
    (term) => term.year === year && term.shortName === shortName,
  );
  return match?.id ?? scheduledTerms[0].id;
}

/** Approximate teaching window used to page the weekly view. */
export function termWindow(term: Term) {
  if (term.shortName === "S2") {
    return {
      start: new Date(term.year, 6, 20),
      end: new Date(term.year, 10, 6),
    };
  }
  return {
    start: new Date(term.year, 1, 16),
    end: new Date(term.year, 5, 5),
  };
}

export function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function clampWeekToTerm(weekStart: Date, term: Term) {
  const window = termWindow(term);
  const first = startOfWeek(window.start);
  const last = startOfWeek(window.end);
  if (weekStart < first) return first;
  if (weekStart > last) return last;
  return startOfWeek(weekStart);
}

export function defaultWeekStart(term: Term, today = new Date()) {
  const window = termWindow(term);
  if (today >= window.start && today <= window.end) {
    return clampWeekToTerm(startOfWeek(today), term);
  }
  return startOfWeek(window.start);
}

export function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 4);
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = shortMonth(weekStart);
  const endMonth = shortMonth(weekEnd);
  const year = weekEnd.getFullYear();
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}-${endDay} ${startMonth} ${year}`;
  }
  return `${startDay} ${startMonth} to ${endDay} ${endMonth} ${year}`;
}

export function formatClock(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatSessionTime(session: ClassSession) {
  return `${WEEKDAYS[session.weekday]} ${formatClock(session.startMinutes)}-${formatClock(session.startMinutes + session.durationMinutes)}`;
}

export function weekdayIndex(date: Date): WeekdayIndex {
  const day = date.getDay();
  return (day === 0 ? 4 : day - 1) as WeekdayIndex;
}

export function sessionTopPx(session: ClassSession) {
  return ((session.startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX;
}

export function sessionHeightPx(session: ClassSession) {
  return (session.durationMinutes / 60) * HOUR_HEIGHT_PX;
}

export function nowLinePx(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = DAY_START_HOUR * 60;
  const end = DAY_END_HOUR * 60;
  if (minutes < start || minutes > end) return null;
  return ((minutes - start) / 60) * HOUR_HEIGHT_PX;
}

export function sessionsForCourse(courseCode: string): ClassSession[] {
  const course = courseByCode(courseCode);
  if (!course) return [];
  const templates =
    sessionTemplates[courseCode] ?? generatedTemplates(courseCode);
  return templates.map((template) => ({
    id: [courseCode, template.kind, template.weekday, template.startHour].join(
      "-",
    ),
    courseCode,
    courseName: course.name,
    accent: course.accent,
    kind: template.kind,
    weekday: template.weekday,
    startMinutes: template.startHour * 60,
    durationMinutes: template.durationHours * 60,
    location: template.location,
  }));
}

export function sessionsForAttempts(attempts: Attempt[], termId: string) {
  const codes = [
    ...new Set(
      attempts
        .filter(
          (attempt) => attempt.termId === termId && attempt.status !== "failed",
        )
        .map((attempt) => attempt.courseCode),
    ),
  ];
  return codes.flatMap((code) => sessionsForCourse(code));
}

function generatedTemplates(courseCode: string): SessionTemplate[] {
  const hash = [...courseCode].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const lectureDay = (hash % 5) as WeekdayIndex;
  const tutorialDay = ((hash + 2) % 5) as WeekdayIndex;
  const lectureHour = 8 + (hash % 8);
  const tutorialHour = 9 + ((hash >> 4) % 8);
  const location = generatedLocations[hash % generatedLocations.length];
  const hasLab = courseCode.startsWith("COMP") && !courseCode.endsWith("00");
  const sessions: SessionTemplate[] = [
    {
      weekday: lectureDay,
      startHour: Math.min(lectureHour, 16),
      durationHours: 2,
      kind: "lecture",
      location,
    },
    {
      weekday:
        tutorialDay === lectureDay
          ? (((tutorialDay + 1) % 5) as WeekdayIndex)
          : tutorialDay,
      startHour: Math.min(tutorialHour, 17),
      durationHours: 1,
      kind: "tutorial",
      location: generatedLocations[(hash + 3) % generatedLocations.length],
    },
  ];
  if (hasLab) {
    sessions.push({
      weekday: ((lectureDay + 3) % 5) as WeekdayIndex,
      startHour: 14,
      durationHours: 2,
      kind: "laboratory",
      location: generatedLocations[(hash + 1) % generatedLocations.length],
    });
  }
  return sessions;
}

function shortMonth(date: Date) {
  return date.toLocaleString("en-GB", { month: "short" });
}
