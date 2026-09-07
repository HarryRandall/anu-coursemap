import { previewWam } from "@/lib/academic/preview-metrics";
export type PreviewCourse = {
  id?: string;
  units?: number;
  current?: boolean;
  termLabel?: string;
  code: string;
  name: string;
  term: string;
  mark?: number;
  resultCode?: SpecialResultCode;
};

export const designs = [
  {
    value: "1",
    label: "Semester timeline",
    description:
      "Average trend and grade mix, followed by current courses and past semesters.",
  },
  {
    value: "2",
    label: "Results ledger",
    description:
      "Individual marks and grade totals above a compact, aligned academic record.",
  },
  {
    value: "3",
    label: "Semester summaries",
    description:
      "Compare semester performance, then expand each semester to review its results.",
  },
];
export const gradeStyles = {
  HD: {
    label: "High distinction",
    colour: "var(--color-emerald-500)",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  D: {
    label: "Distinction",
    colour: "var(--color-sky-500)",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  CR: {
    label: "Credit",
    colour: "var(--color-violet-500)",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  P: {
    label: "Pass",
    colour: "var(--color-amber-500)",
    badge: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  N: {
    label: "Fail",
    colour: "var(--color-rose-500)",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};
export const grades = ["HD", "D", "CR", "P", "N"] as const;
export const examples = [
  { value: "results", label: "Results and current courses" },
  { value: "current", label: "Current courses only" },
  { value: "planned", label: "Planned courses only" },
];
export const periods = [
  { value: "2026-s2", label: "Semester 2, 2026" },
  { value: "2026-s1", label: "Semester 1, 2026" },
  { value: "2025-s2", label: "Semester 2, 2025" },
  { value: "2025-s1", label: "Semester 1, 2025" },
];
export const sampleCourses: PreviewCourse[] = [
  {
    code: "COMP1110",
    name: "Structured Programming",
    term: "2025-s1",
    mark: 81,
  },
  {
    code: "MATH1013",
    name: "Mathematics and Applications 1",
    term: "2025-s1",
    mark: 73,
  },
  {
    code: "BUSN1001",
    name: "Business Reporting and Analysis",
    term: "2025-s1",
    mark: 56,
  },
  { code: "ECON1101", name: "Microeconomics 1", term: "2025-s1", mark: 46 },
  { code: "COMP3600", name: "Algorithms", term: "2026-s2" },
  { code: "COMP3900", name: "Computer Science Project", term: "2026-s2" },
  {
    code: "COMP2100",
    name: "Software Design Methodologies",
    term: "2026-s1",
    mark: 86,
  },
  {
    code: "COMP2300",
    name: "Computer Organisation",
    term: "2026-s1",
    mark: 79,
  },
  { code: "COMP2400", name: "Relational Databases", term: "2026-s1", mark: 83 },
  { code: "COMP2120", name: "Software Engineering", term: "2026-s1", mark: 80 },
  {
    code: "COMP1100",
    name: "Programming as Problem Solving",
    term: "2025-s2",
    mark: 74,
  },
  {
    code: "MATH1005",
    name: "Discrete Mathematical Models",
    term: "2025-s2",
    mark: 82,
  },
  {
    code: "COMP1600",
    name: "Foundations of Computing",
    term: "2025-s2",
    mark: 68,
  },
  {
    code: "STAT1008",
    name: "Quantitative Research Methods",
    term: "2025-s2",
    mark: 76,
  },
];
export function exampleCourses(example: string) {
  if (example === "planned") return [];
  return sampleCourses.filter(
    (course) => example === "results" || course.mark === undefined,
  );
}
export function averageMark(courses: PreviewCourse[]) {
  const average = previewWam(courses);
  return average === null ? "Not set" : average.toFixed(1);
}
export function gradeForMark(mark: number) {
  return mark >= 80
    ? "HD"
    : mark >= 70
      ? "D"
      : mark >= 60
        ? "CR"
        : mark >= 50
          ? "P"
          : "N";
}

export function shortPeriod(term: string) {
  const [year, semester] = term.split("-");
  return `Sem ${semester.slice(1)} ${year.slice(2)}`;
}
export function semesterChartData(courses: PreviewCourse[]) {
  return [...periods].reverse().flatMap((period) => {
    const results = courses.filter(
      (course) => course.term === period.value && course.mark !== undefined,
    );
    if (!results.length) return [];
    return [
      {
        label: shortPeriod(period.value),
        average: Number(averageMark(results)),
        ...Object.fromEntries(
          grades.map((grade) => [
            grade,
            results.filter((course) => gradeForMark(course.mark ?? 0) === grade)
              .length,
          ]),
        ),
      },
    ];
  });
}

// ANU grading scale: https://www.anu.edu.au/students/program-administration/assessments-exams/grading-scale
export const specialResults = [
  { value: "PS", label: "PS · Supplementary pass" },
  { value: "NCN", label: "NCN · Not completed / fail" },
  { value: "CRS", label: "CRS · Course requirement satisfied" },
  { value: "CRN", label: "CRN · Requirement not satisfied (COVID-19)" },
  { value: "HLP", label: "HLP · Higher level pass" },
  { value: "WD", label: "WD · Withdrawn without failure" },
  { value: "WL", label: "WL · Withdrawn late without failure" },
  { value: "WN", label: "WN · Withdrawn with failure" },
  { value: "DA", label: "DA · Deferred assessment" },
  { value: "PX", label: "PX · Supplementary assessment offered" },
  { value: "RP", label: "RP · Result pending" },
  { value: "WA", label: "WA · Withheld for administrative reasons" },
  { value: "WF", label: "WF · Withheld for fees reasons" },
  { value: "KU", label: "KU · Continuing course" },
  { value: "RC", label: "RC · Research continuing" },
  { value: "STE", label: "STE · External status" },
  { value: "STI", label: "STI · Internal status" },
  { value: "EE", label: "EE · Enrolled elsewhere" },
] as const;
export type SpecialResultCode = (typeof specialResults)[number]["value"];
export type PreviewResult = { mark?: number; resultCode?: SpecialResultCode };
export function hasResult(course: PreviewCourse) {
  return course.mark !== undefined || course.resultCode !== undefined;
}
export function parsePreviewResult(
  kind: string,
  input: string,
):
  { result: PreviewResult; error?: never } | { error: string; result?: never } {
  if (kind !== "mark" && kind !== "NCN") {
    const option = specialResults.find((item) => item.value === kind);
    if (!option) return { error: "Choose a result type." };
    return {
      result: {
        resultCode: option.value,
        mark: option.value === "PS" ? 50 : undefined,
      },
    };
  }
  const text = input.trim();
  const mark = Number(text);
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(text) ||
    !Number.isFinite(mark) ||
    mark < 0 ||
    mark > 100
  )
    return {
      error: "Enter a mark from 0 to 100, with up to two decimal places.",
    };
  return { result: { mark, resultCode: kind === "NCN" ? "NCN" : undefined } };
}
export function resultLabel(course: PreviewCourse) {
  return (
    course.resultCode ??
    (course.mark === undefined ? "Awaiting result" : gradeForMark(course.mark))
  );
}

export function resultCodeBadge(code: SpecialResultCode) {
  if (["NCN", "WN", "CRN"].includes(code)) return gradeStyles.N.badge;
  if (["PS", "CRS", "HLP"].includes(code)) return gradeStyles.HD.badge;
  if (["DA", "PX", "RP", "WA", "WF", "KU", "RC"].includes(code))
    return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "bg-secondary text-muted-foreground";
}
