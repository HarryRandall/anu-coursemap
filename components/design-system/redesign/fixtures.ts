/** Fictional student plan used only by the development design preview. */
export const previewPlan = {
  degree: "Bachelor of Advanced Computing (Honours)",
  total: 192,
  completed: 48,
  enrolled: 24,
  planned: 90,
  unallocated: 30,
  commencement: 2025,
  completion: 2028,
};

export const previewCourses = [
  {
    code: "COMP2100",
    name: "Software Design Methodologies",
    units: 6,
    status: "Ready to enrol",
    tone: "green",
    term: "Semester 1, 2027",
  },
  {
    code: "COMP2300",
    name: "Computer Organisation and Program Execution",
    units: 6,
    status: "Ready to enrol",
    tone: "green",
    term: "Semester 1, 2027",
  },
  {
    code: "COMP2400",
    name: "Relational Databases",
    units: 6,
    status: "Check prerequisites",
    tone: "amber",
    term: "Semester 1, 2027",
  },
  {
    code: "MATH2301",
    name: "Algebra 1",
    units: 6,
    status: "Check prerequisites",
    tone: "amber",
    term: "Semester 1, 2027",
  },
] as const;

export const previewTerms = [
  { name: "S1 '25", completed: 24, remaining: 0 },
  { name: "S2 '25", completed: 24, remaining: 0 },
  { name: "S1 '26", completed: 0, remaining: 0 },
  { name: "S2 '26", completed: 0, remaining: 24 },
  { name: "S1 '27", completed: 0, remaining: 24 },
  { name: "S2 '27", completed: 0, remaining: 24 },
  { name: "S1 '28", completed: 0, remaining: 24 },
  { name: "S2 '28", completed: 0, remaining: 18 },
];

export const previewRequirements = [
  {
    title: "Computing core",
    completed: 30,
    total: 72,
    detail:
      "Five core courses completed. Next in the sample plan: COMP2100 and COMP2300.",
  },
  {
    title: "Mathematics",
    completed: 12,
    total: 24,
    detail:
      "Two mathematics courses completed. Check MATH2301 prerequisites before placing it in your plan.",
  },
  {
    title: "Electives & specialisation",
    completed: 6,
    total: 96,
    detail:
      "One elective completed. Thirty degree units are still unallocated in this sample plan.",
  },
];
