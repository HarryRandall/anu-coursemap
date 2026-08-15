import {
  courseByCode,
  terms,
  type Attempt,
  type Course,
  type Term,
} from "@/lib/catalogue";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const shortMonths: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type CalendarEvent = {
  attempt: Attempt;
  course: Course;
  term: Term;
};

export type YearMonth = { year: number; month: number };

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseTermRange(term: Term) {
  if (term.id === "unscheduled") return null;
  const [startLabel, endLabel] = term.dates.split(" - ");
  const startMonth = shortMonths[startLabel];
  const endMonth = shortMonths[endLabel];
  if (startMonth === undefined || endMonth === undefined) return null;
  return {
    start: new Date(term.year, startMonth, 1),
    end: new Date(term.year, endMonth + 1, 0),
  };
}

export function termContaining(date: Date) {
  const day = startOfDay(date);
  return (
    terms.find((term) => {
      const range = parseTermRange(term);
      return range && day >= range.start && day <= range.end;
    }) ?? null
  );
}

export function monthLabel({ year, month }: YearMonth) {
  return `${monthNames[month]} ${year}`;
}

export function shiftMonth(
  { year, month }: YearMonth,
  delta: number,
): YearMonth {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/** Monday-first grid of dates for a month, with nulls for leading/trailing cells. */
export function monthCells({ year, month }: YearMonth) {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekdaySlot(code: string) {
  const seed = code
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  return seed % 5;
}

function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function attemptsForTerm(attempts: Attempt[], termId: string) {
  return attempts.filter(
    (attempt) => attempt.termId === termId && attempt.status !== "failed",
  );
}

/**
 * Courses from the study period that covers this day, placed on a stable
 * weekday so the month grid reads as a calendar rather than a year board.
 */
export function eventsOnDay(date: Date, attempts: Attempt[]): CalendarEvent[] {
  if (mondayIndex(date) > 4) return [];
  const term = termContaining(date);
  if (!term) return [];
  return attemptsForTerm(attempts, term.id).flatMap((attempt) => {
    const course = courseByCode(attempt.courseCode);
    if (!course) return [];
    if (weekdaySlot(course.code) !== mondayIndex(date)) return [];
    return [{ attempt, course, term }];
  });
}

export function eventsInMonth(focus: YearMonth, attempts: Attempt[]) {
  const seen = new Map<string, CalendarEvent>();
  for (const cell of monthCells(focus)) {
    if (!cell) continue;
    for (const event of eventsOnDay(cell, attempts)) {
      seen.set(event.attempt.id, event);
    }
  }
  return [...seen.values()];
}

export function focusMonthForPlan(
  attempts: Attempt[],
  today = new Date(),
): YearMonth {
  const currentTerm = termContaining(today);
  if (currentTerm && attemptsForTerm(attempts, currentTerm.id).length > 0) {
    return { year: today.getFullYear(), month: today.getMonth() };
  }

  const upcoming = terms.find((term) => {
    const range = parseTermRange(term);
    return (
      Boolean(range) &&
      range!.start >= startOfDay(today) &&
      attemptsForTerm(attempts, term.id).length > 0
    );
  });
  if (upcoming) {
    const range = parseTermRange(upcoming);
    if (range) {
      return { year: range.start.getFullYear(), month: range.start.getMonth() };
    }
  }

  const withCourses = terms.find(
    (term) => attemptsForTerm(attempts, term.id).length > 0,
  );
  if (withCourses) {
    const range = parseTermRange(withCourses);
    if (range) {
      return { year: range.start.getFullYear(), month: range.start.getMonth() };
    }
  }

  return { year: today.getFullYear(), month: today.getMonth() };
}

export function currentTermLoad(attempts: Attempt[], today = new Date()) {
  const term = termContaining(today);
  if (!term) {
    return { term: null, units: 0, courses: 0 };
  }
  const placed = attemptsForTerm(attempts, term.id).flatMap((attempt) => {
    const course = courseByCode(attempt.courseCode);
    return course ? [{ attempt, course }] : [];
  });
  return {
    term,
    courses: placed.length,
    units: placed.reduce((total, item) => total + item.course.units, 0),
  };
}
