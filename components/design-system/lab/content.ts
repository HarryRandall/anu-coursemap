/**
 * Representative ANU and Coursemap content for the laboratory.
 * Real course codes, titles, sessions and requirement structures so the
 * components are judged against the text they will actually carry.
 */

export type CourseStatus = "completed" | "enrolled" | "planned" | "locked";

export type Course = {
  id: string;
  code: string;
  title: string;
  units: number;
  session: string;
  college: string;
  convener: string;
  status: CourseStatus;
  prerequisites: string[];
  enrolled: number;
  capacity: number;
};

export const courses: Course[] = [
  {
    id: "comp1100",
    code: "COMP1100",
    title: "Programming as Problem Solving",
    units: 6,
    session: "Semester 1, 2026",
    college: "Engineering and Computer Science",
    convener: "Dr Ranald Clouston",
    status: "completed",
    prerequisites: [],
    enrolled: 612,
    capacity: 640,
  },
  {
    id: "comp1110",
    code: "COMP1110",
    title: "Structured Programming",
    units: 6,
    session: "Semester 2, 2026",
    college: "Engineering and Computer Science",
    convener: "Dr Steve Blackburn",
    status: "completed",
    prerequisites: ["COMP1100"],
    enrolled: 488,
    capacity: 520,
  },
  {
    id: "math1013",
    code: "MATH1013",
    title: "Mathematics and Applications 1",
    units: 6,
    session: "Semester 1, 2026",
    college: "Science",
    convener: "Dr Kate Turner",
    status: "completed",
    prerequisites: [],
    enrolled: 731,
    capacity: 780,
  },
  {
    id: "comp2100",
    code: "COMP2100",
    title: "Software Design Methodologies",
    units: 6,
    session: "Semester 1, 2026",
    college: "Engineering and Computer Science",
    convener: "Dr Alex Potanin",
    status: "enrolled",
    prerequisites: ["COMP1110"],
    enrolled: 274,
    capacity: 300,
  },
  {
    id: "comp2610",
    code: "COMP2610",
    title: "Information Theory",
    units: 6,
    session: "Semester 2, 2026",
    college: "Engineering and Computer Science",
    convener: "Dr Robert Williamson",
    status: "planned",
    prerequisites: ["MATH1013"],
    enrolled: 118,
    capacity: 160,
  },
  {
    id: "comp3600",
    code: "COMP3600",
    title: "Algorithms",
    units: 6,
    session: "Semester 1, 2027",
    college: "Engineering and Computer Science",
    convener: "Dr Weifa Liang",
    status: "locked",
    prerequisites: ["COMP2100", "MATH1013"],
    enrolled: 0,
    capacity: 180,
  },
  {
    id: "stat2001",
    code: "STAT2001",
    title: "Introductory Mathematical Statistics",
    units: 6,
    session: "Semester 2, 2026",
    college: "Science",
    convener: "Dr Zdravko Botev",
    status: "planned",
    prerequisites: ["MATH1013"],
    enrolled: 96,
    capacity: 140,
  },
  {
    id: "engn2218",
    code: "ENGN2218",
    title: "Electronic Systems and Design",
    units: 6,
    session: "Semester 2, 2026",
    college: "Engineering and Computer Science",
    convener: "Dr Salman Durrani",
    status: "locked",
    prerequisites: ["ENGN1218"],
    enrolled: 0,
    capacity: 200,
  },
];

export const statusLabels: Record<CourseStatus, string> = {
  completed: "Completed",
  enrolled: "Enrolled",
  planned: "Planned",
  locked: "Prerequisites unmet",
};

export const sessions = [
  { id: "2026-s1", label: "Semester 1, 2026" },
  { id: "2026-w", label: "Winter Session, 2026" },
  { id: "2026-s2", label: "Semester 2, 2026" },
  { id: "2026-summer", label: "Summer Session, 2026-27" },
  { id: "2027-s1", label: "Semester 1, 2027" },
];

export const colleges = [
  { id: "cecs", label: "Engineering and Computer Science" },
  { id: "science", label: "Science" },
  { id: "cass", label: "Arts and Social Sciences" },
  { id: "cbe", label: "Business and Economics" },
  { id: "law", label: "Law" },
  { id: "cap", label: "Asia and the Pacific" },
];

export const programmes = [
  {
    id: "bac",
    code: "AUBAC",
    title: "Bachelor of Advanced Computing (Honours)",
    units: 192,
    completed: 96,
    years: 4,
  },
  {
    id: "bsc",
    code: "ASCIE",
    title: "Bachelor of Science",
    units: 144,
    completed: 42,
    years: 3,
  },
  {
    id: "bph",
    code: "APPHI",
    title: "Bachelor of Philosophy (Honours) - Science",
    units: 192,
    completed: 0,
    years: 4,
  },
];

export const requirements = [
  {
    id: "compulsory",
    title: "Compulsory computing courses",
    detail: "48 units from the completion of the following courses",
    required: 48,
    completed: 36,
    courses: ["COMP1100", "COMP1110", "COMP2100", "COMP2110", "COMP2300"],
  },
  {
    id: "mathematics",
    title: "Mathematics foundation",
    detail: "12 units from the completion of the following courses",
    required: 12,
    completed: 12,
    courses: ["MATH1013", "MATH1014"],
  },
  {
    id: "electives",
    title: "Computing electives",
    detail: "36 units from completion of courses from the subject area COMP",
    required: 36,
    completed: 6,
    courses: ["COMP2610", "COMP3600", "COMP3670"],
  },
  {
    id: "breadth",
    title: "Elective breadth",
    detail: "48 units from completion of courses from across the University",
    required: 48,
    completed: 0,
    courses: [],
  },
];

export const buildings = [
  { id: "hn", label: "Hanna Neumann Building 145", short: "HN 145" },
  { id: "cse", label: "CSIT Building 108", short: "CSIT 108" },
  { id: "chifley", label: "Chifley Library 15", short: "Chifley 15" },
  { id: "kambri", label: "Kambri Cultural Centre 153", short: "Kambri 153" },
  { id: "manning", label: "Manning Clark Centre 26A", short: "MCC 26A" },
];

export const advisers = [
  {
    id: "amina",
    name: "Amina Okafor",
    role: "Student adviser, CECS",
    initials: "AO",
  },
  {
    id: "tom",
    name: "Tom Nguyen",
    role: "Programme convener",
    initials: "TN",
  },
  {
    id: "priya",
    name: "Priya Raghavan",
    role: "Academic skills adviser",
    initials: "PR",
  },
  {
    id: "jesse",
    name: "Jesse Whitlam",
    role: "Course convener",
    initials: "JW",
  },
];

/** Enrolment by teaching period, for the chart and metric examples. */
export const enrolmentSeries = [
  { period: "2023 S1", enrolments: 1840, withdrawals: 96 },
  { period: "2023 S2", enrolments: 1712, withdrawals: 88 },
  { period: "2024 S1", enrolments: 2064, withdrawals: 104 },
  { period: "2024 S2", enrolments: 1958, withdrawals: 91 },
  { period: "2025 S1", enrolments: 2310, withdrawals: 118 },
  { period: "2025 S2", enrolments: 2186, withdrawals: 102 },
  { period: "2026 S1", enrolments: 2492, withdrawals: 96 },
];

export const keyDates = [
  { id: "census", label: "Census date", date: "2026-03-31" },
  { id: "drop", label: "Last day to drop without failure", date: "2026-05-08" },
  { id: "exams", label: "Examination period opens", date: "2026-06-05" },
];
