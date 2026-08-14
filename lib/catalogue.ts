export type Accent = "blue" | "violet" | "mint" | "amber" | "rose" | "cyan";

export type Course = {
  code: string;
  name: string;
  year: number;
  units: number;
  level: number;
  subject: string;
  school: string;
  convener: string;
  sessions: string[];
  delivery: string;
  description: string;
  prerequisiteText: string;
  prerequisiteCodes: string[];
  corequisiteText?: string;
  incompatibilities: string[];
  permissionText?: string;
  countsTowards: string[];
  sourceUrl: string;
  lastChanged: string;
  parseState: "Verified" | "Automatic" | "Review";
  accent: Accent;
};

export type Degree = {
  code: string;
  name: string;
  units: number;
  duration: number;
  college: string;
  description: string;
};

export type Major = {
  code: string;
  name: string;
  units: number;
  colour: string;
  description: string;
  courseCodes: string[];
};

export type AttemptStatus = "completed" | "failed" | "planned" | "enrolled";

export type Attempt = {
  id: string;
  courseCode: string;
  termId: string;
  status: AttemptStatus;
  mark?: number;
  permissionApproved?: boolean;
  overloadApproved?: boolean;
};

export type Term = {
  id: string;
  year: number;
  name: string;
  shortName: string;
  dates: string;
};

export type Relation = {
  id: string;
  source: string;
  relation: string;
  target: string;
  group: string;
  hardness: "Hard" | "Advisory" | "Allocation";
  confidence: number;
  state: "Verified" | "Automatic" | "Review";
  sourceText: string;
};

export const catalogueYears = [2024, 2025, 2026];

export const courses: Course[] = [
  {
    code: "COMP1100",
    name: "Programming as Problem Solving",
    year: 2026,
    units: 6,
    level: 1000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Alex Chen",
    sessions: ["Semester 1"],
    delivery: "In person",
    description:
      "A first course in programming, computational thinking and systematic problem solving.",
    prerequisiteText: "None",
    prerequisiteCodes: [],
    incompatibilities: ["COMP1130"],
    countsTowards: ["Computing core", "Software Development major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP1100",
    lastChanged: "3 Mar 2026",
    parseState: "Verified",
    accent: "blue",
  },
  {
    code: "MATH1005",
    name: "Discrete Mathematical Models",
    year: 2026,
    units: 6,
    level: 1000,
    subject: "Mathematics",
    school: "Mathematical Sciences Institute",
    convener: "Prof Mia Foster",
    sessions: ["Semester 1", "Semester 2"],
    delivery: "In person",
    description:
      "Discrete structures and mathematical reasoning used throughout computing.",
    prerequisiteText: "None",
    prerequisiteCodes: [],
    incompatibilities: ["MATH6005"],
    countsTowards: ["Mathematics requirement", "Degree core"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/MATH1005",
    lastChanged: "18 Feb 2026",
    parseState: "Verified",
    accent: "violet",
  },
  {
    code: "COMP1110",
    name: "Structured Programming",
    year: 2026,
    units: 6,
    level: 1000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Alex Chen",
    sessions: ["Semester 2"],
    delivery: "In person",
    description:
      "Object-oriented design, data structures and larger-scale programming practice.",
    prerequisiteText: "Completion of COMP1100 or COMP1130",
    prerequisiteCodes: ["COMP1100"],
    incompatibilities: ["COMP1140", "COMP6710"],
    countsTowards: ["Computing core", "Software Development major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP1110",
    lastChanged: "6 Mar 2026",
    parseState: "Verified",
    accent: "mint",
  },
  {
    code: "COMP1600",
    name: "Foundations of Computing",
    year: 2026,
    units: 6,
    level: 1000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Priya Nair",
    sessions: ["Semester 2"],
    delivery: "In person",
    description:
      "Logical and mathematical foundations for analysing computation and algorithms.",
    prerequisiteText: "None",
    prerequisiteCodes: [],
    incompatibilities: ["COMP6260"],
    countsTowards: ["Computing core", "Theoretical Computer Science major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP1600",
    lastChanged: "12 Jan 2026",
    parseState: "Automatic",
    accent: "cyan",
  },
  {
    code: "COMP2100",
    name: "Software Design Methodologies",
    year: 2026,
    units: 6,
    level: 2000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Sarah Lim",
    sessions: ["Semester 1"],
    delivery: "In person",
    description:
      "Techniques for designing, testing and maintaining reliable software systems.",
    prerequisiteText: "Successful completion of COMP1110",
    prerequisiteCodes: ["COMP1110"],
    incompatibilities: ["COMP6442"],
    countsTowards: ["Computing core", "Software Development major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP2100",
    lastChanged: "21 Apr 2026",
    parseState: "Verified",
    accent: "amber",
  },
  {
    code: "COMP2120",
    name: "Software Engineering",
    year: 2026,
    units: 6,
    level: 2000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Sarah Lim",
    sessions: ["Semester 2"],
    delivery: "In person",
    description:
      "Team-based software engineering, requirements, architecture and delivery practices.",
    prerequisiteText: "COMP2100",
    prerequisiteCodes: ["COMP2100"],
    incompatibilities: ["COMP6120"],
    countsTowards: ["Software Development major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP2120",
    lastChanged: "2 May 2026",
    parseState: "Automatic",
    accent: "blue",
  },
  {
    code: "COMP2300",
    name: "Computer Organisation and Program Execution",
    year: 2026,
    units: 6,
    level: 2000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Noah Williams",
    sessions: ["Semester 1"],
    delivery: "In person",
    description:
      "How programs execute across instruction sets, memory and processor architecture.",
    prerequisiteText: "COMP1110 and COMP1600",
    prerequisiteCodes: ["COMP1110", "COMP1600"],
    incompatibilities: ["COMP6300"],
    countsTowards: ["Computing core", "Cyber Security major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP2300",
    lastChanged: "15 Feb 2026",
    parseState: "Automatic",
    accent: "rose",
  },
  {
    code: "COMP2310",
    name: "Systems, Networks and Concurrency",
    year: 2026,
    units: 6,
    level: 2000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Noah Williams",
    sessions: ["Semester 2"],
    delivery: "In person",
    description:
      "Operating systems, networks, concurrency and the design of reliable systems software.",
    prerequisiteText: "COMP2300",
    prerequisiteCodes: ["COMP2300"],
    incompatibilities: ["COMP6310"],
    countsTowards: ["Computing core", "Cyber Security major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP2310",
    lastChanged: "15 Feb 2026",
    parseState: "Automatic",
    accent: "rose",
  },
  {
    code: "COMP2400",
    name: "Relational Databases",
    year: 2026,
    units: 6,
    level: 2000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Emma Rossi",
    sessions: ["Semester 1", "Semester 2"],
    delivery: "Hybrid",
    description:
      "Data modelling, relational theory, SQL and dependable database application design.",
    prerequisiteText: "COMP1110",
    prerequisiteCodes: ["COMP1110"],
    incompatibilities: ["COMP6240"],
    countsTowards: ["Computing elective", "Data Science major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP2400",
    lastChanged: "29 Mar 2026",
    parseState: "Automatic",
    accent: "violet",
  },
  {
    code: "COMP2610",
    name: "Information Theory",
    year: 2026,
    units: 6,
    level: 2000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Prof Mia Foster",
    sessions: ["Semester 2"],
    delivery: "In person",
    description:
      "Mathematical foundations of information, coding, compression and communication.",
    prerequisiteText: "MATH1005 and 6 units of programming",
    prerequisiteCodes: ["MATH1005", "COMP1100"],
    incompatibilities: ["COMP6261"],
    countsTowards: ["Theoretical Computer Science major", "Computing elective"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP2610",
    lastChanged: "9 Jun 2026",
    parseState: "Review",
    accent: "cyan",
  },
  {
    code: "COMP3430",
    name: "Cybercrime",
    year: 2026,
    units: 6,
    level: 3000,
    subject: "Cyber Security",
    school: "School of Computing",
    convener: "Dr Owen Park",
    sessions: ["Semester 2"],
    delivery: "Hybrid",
    description:
      "Technical, legal and social dimensions of cybercrime and digital investigations.",
    prerequisiteText: "12 units of 2000-level COMP courses",
    prerequisiteCodes: ["COMP2300", "COMP2310"],
    incompatibilities: [],
    countsTowards: ["Cyber Security major", "3000-level computing requirement"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP3430",
    lastChanged: "7 Jul 2026",
    parseState: "Review",
    accent: "rose",
  },
  {
    code: "COMP3600",
    name: "Algorithms",
    year: 2026,
    units: 6,
    level: 3000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Priya Nair",
    sessions: ["Semester 1"],
    delivery: "In person",
    description:
      "Design and analysis of efficient algorithms for challenging computational problems.",
    prerequisiteText: "COMP2100 and COMP1600",
    prerequisiteCodes: ["COMP2100", "COMP1600"],
    incompatibilities: ["COMP6600"],
    countsTowards: ["Computing core", "Theoretical Computer Science major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP3600",
    lastChanged: "11 May 2026",
    parseState: "Verified",
    accent: "cyan",
  },
  {
    code: "COMP3620",
    name: "Artificial Intelligence",
    year: 2026,
    units: 6,
    level: 3000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Dr Leila Morgan",
    sessions: ["Semester 2"],
    delivery: "In person",
    description:
      "Search, reasoning, planning and learning techniques for intelligent systems.",
    prerequisiteText: "COMP2100 and MATH1005",
    prerequisiteCodes: ["COMP2100", "MATH1005"],
    incompatibilities: ["COMP6320"],
    countsTowards: [
      "Intelligent Systems major",
      "3000-level computing requirement",
    ],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP3620",
    lastChanged: "13 Apr 2026",
    parseState: "Automatic",
    accent: "mint",
  },
  {
    code: "COMP3670",
    name: "Introduction to Machine Learning",
    year: 2026,
    units: 6,
    level: 3000,
    subject: "Data Science",
    school: "School of Computing",
    convener: "Dr Leila Morgan",
    sessions: ["Semester 1"],
    delivery: "Hybrid",
    description: "Foundational models and methods for learning from data.",
    prerequisiteText: "MATH1005 and COMP2100",
    prerequisiteCodes: ["MATH1005", "COMP2100"],
    incompatibilities: ["COMP6670"],
    countsTowards: ["Data Science major", "Intelligent Systems major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP3670",
    lastChanged: "26 May 2026",
    parseState: "Automatic",
    accent: "mint",
  },
  {
    code: "COMP3703",
    name: "Software Security",
    year: 2026,
    units: 6,
    level: 3000,
    subject: "Cyber Security",
    school: "School of Computing",
    convener: "Dr Owen Park",
    sessions: ["Semester 1"],
    delivery: "In person",
    description:
      "Secure software design, implementation, testing and vulnerability analysis.",
    prerequisiteText: "COMP2100 and COMP2300",
    prerequisiteCodes: ["COMP2100", "COMP2300"],
    incompatibilities: ["COMP6703"],
    countsTowards: ["Cyber Security major", "Software Development major"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP3703",
    lastChanged: "1 Jun 2026",
    parseState: "Automatic",
    accent: "amber",
  },
  {
    code: "COMP3900",
    name: "Computing Project",
    year: 2026,
    units: 12,
    level: 3000,
    subject: "Computing",
    school: "School of Computing",
    convener: "Prof Daniel Wright",
    sessions: ["Semester 1", "Semester 2"],
    delivery: "Project",
    description:
      "A substantial team project integrating technical knowledge and professional practice.",
    prerequisiteText: "96 units completed, including COMP2100",
    prerequisiteCodes: ["COMP2100"],
    incompatibilities: ["COMP6390"],
    permissionText:
      "Permission from the course convener is required before enrolment.",
    countsTowards: ["Capstone", "3000-level computing requirement"],
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/course/COMP3900",
    lastChanged: "30 Jun 2026",
    parseState: "Verified",
    accent: "amber",
  },
];

export const degrees: Degree[] = [
  {
    code: "BCOMP",
    name: "Bachelor of Computing",
    units: 144,
    duration: 3,
    college: "College of Systems and Society",
    description:
      "A flexible computing degree with a major, core courses and room for electives.",
  },
  {
    code: "BACOMPH",
    name: "Bachelor of Advanced Computing (Honours)",
    units: 192,
    duration: 4,
    college: "College of Systems and Society",
    description:
      "An intensive computing programme with advanced study and an honours research year.",
  },
  {
    code: "BIT",
    name: "Bachelor of Information Technology",
    units: 144,
    duration: 3,
    college: "College of Systems and Society",
    description:
      "Applied information technology with flexible computing and university electives.",
  },
];

export const majors: Major[] = [
  {
    code: "SOFT-MAJ",
    name: "Software Development",
    units: 48,
    colour: "#8b5cf6",
    description: "Design, build and maintain dependable software systems.",
    courseCodes: [
      "COMP1100",
      "COMP1110",
      "COMP2100",
      "COMP2120",
      "COMP3703",
      "COMP3900",
    ],
  },
  {
    code: "CYBR-MAJ",
    name: "Cyber Security",
    units: 48,
    colour: "#e05f7e",
    description:
      "Secure software, systems, networks and information infrastructure.",
    courseCodes: [
      "COMP1100",
      "COMP1110",
      "COMP2300",
      "COMP2310",
      "COMP3430",
      "COMP3703",
    ],
  },
  {
    code: "DASC-MAJ",
    name: "Data Science",
    units: 48,
    colour: "#158b68",
    description: "Turn complex data into useful models and decisions.",
    courseCodes: ["MATH1005", "COMP1110", "COMP2400", "COMP3670", "COMP3900"],
  },
  {
    code: "AINT-MAJ",
    name: "Intelligent Systems",
    units: 48,
    colour: "#ca7b16",
    description: "Build systems that learn, reason and act autonomously.",
    courseCodes: ["MATH1005", "COMP1110", "COMP2100", "COMP3620", "COMP3670"],
  },
  {
    code: "THCS-MAJ",
    name: "Theoretical Computer Science",
    units: 48,
    colour: "#2883d8",
    description:
      "Explore computation through logic, algorithms and complexity.",
    courseCodes: ["MATH1005", "COMP1600", "COMP2100", "COMP2610", "COMP3600"],
  },
];

export const terms: Term[] = [
  {
    id: "2026-s1",
    year: 2026,
    name: "Semester 1",
    shortName: "S1",
    dates: "Feb - Jun",
  },
  {
    id: "2026-s2",
    year: 2026,
    name: "Semester 2",
    shortName: "S2",
    dates: "Jul - Nov",
  },
  {
    id: "2027-s1",
    year: 2027,
    name: "Semester 1",
    shortName: "S1",
    dates: "Feb - Jun",
  },
  {
    id: "2027-s2",
    year: 2027,
    name: "Semester 2",
    shortName: "S2",
    dates: "Jul - Nov",
  },
  {
    id: "2028-s1",
    year: 2028,
    name: "Semester 1",
    shortName: "S1",
    dates: "Feb - Jun",
  },
  {
    id: "2028-s2",
    year: 2028,
    name: "Semester 2",
    shortName: "S2",
    dates: "Jul - Nov",
  },
  {
    id: "unscheduled",
    year: 2029,
    name: "Later",
    shortName: "Later",
    dates: "Not scheduled",
  },
];

export const initialAttempts: Attempt[] = [
  {
    id: "a-comp1100",
    courseCode: "COMP1100",
    termId: "2026-s1",
    status: "completed",
    mark: 78,
  },
  {
    id: "a-math1005",
    courseCode: "MATH1005",
    termId: "2026-s1",
    status: "completed",
    mark: 72,
  },
  {
    id: "a-comp1110-fail",
    courseCode: "COMP1110",
    termId: "2026-s2",
    status: "failed",
    mark: 43,
  },
  {
    id: "a-comp1600",
    courseCode: "COMP1600",
    termId: "2026-s2",
    status: "planned",
  },
  {
    id: "a-comp1110-repeat",
    courseCode: "COMP1110",
    termId: "2027-s1",
    status: "planned",
  },
  {
    id: "a-comp2100",
    courseCode: "COMP2100",
    termId: "2027-s2",
    status: "planned",
  },
  {
    id: "a-comp2120",
    courseCode: "COMP2120",
    termId: "2028-s1",
    status: "planned",
  },
  {
    id: "a-comp3900",
    courseCode: "COMP3900",
    termId: "2028-s2",
    status: "planned",
  },
];

export const relations: Relation[] = [
  {
    id: "r1",
    source: "COMP1110",
    relation: "Prerequisite",
    target: "COMP1100",
    group: "one_of:1",
    hardness: "Hard",
    confidence: 99,
    state: "Verified",
    sourceText: "Completion of COMP1100 or COMP1130",
  },
  {
    id: "r2",
    source: "COMP2100",
    relation: "Prerequisite",
    target: "COMP1110",
    group: "all_of:1",
    hardness: "Hard",
    confidence: 100,
    state: "Verified",
    sourceText: "Successful completion of COMP1110",
  },
  {
    id: "r3",
    source: "COMP2300",
    relation: "Prerequisite",
    target: "COMP1110",
    group: "all_of:1",
    hardness: "Hard",
    confidence: 98,
    state: "Automatic",
    sourceText: "COMP1110 and COMP1600",
  },
  {
    id: "r4",
    source: "COMP2300",
    relation: "Prerequisite",
    target: "COMP1600",
    group: "all_of:1",
    hardness: "Hard",
    confidence: 98,
    state: "Automatic",
    sourceText: "COMP1110 and COMP1600",
  },
  {
    id: "r5",
    source: "COMP3900",
    relation: "Permission",
    target: "Course convener",
    group: "all_of:2",
    hardness: "Hard",
    confidence: 100,
    state: "Verified",
    sourceText: "...and permission of the course convener",
  },
  {
    id: "r6",
    source: "COMP2100",
    relation: "Incompatible",
    target: "COMP6442",
    group: "incompat:1",
    hardness: "Hard",
    confidence: 97,
    state: "Automatic",
    sourceText: "Incompatible with COMP6442",
  },
  {
    id: "r7",
    source: "BCOMP",
    relation: "Requires",
    target: "SOFT-MAJ",
    group: "structure:major",
    hardness: "Allocation",
    confidence: 96,
    state: "Automatic",
    sourceText: "48 units from completion of one listed major",
  },
  {
    id: "r8",
    source: "COMP2610",
    relation: "Prerequisite",
    target: "6 units programming",
    group: "all_of:2",
    hardness: "Hard",
    confidence: 71,
    state: "Review",
    sourceText: "MATH1005 and at least 6 units of programming courses",
  },
];

export const requirementGroups = [
  {
    id: "core",
    name: "Computing core",
    description: "Eight compulsory computing courses",
    total: 48,
    colour: "#8b5cf6",
  },
  {
    id: "math",
    name: "Mathematics requirement",
    description: "Six units from the approved mathematics list",
    total: 6,
    colour: "#2883d8",
  },
  {
    id: "major",
    name: "Selected major",
    description: "Complete one 48-unit computing major",
    total: 48,
    colour: "#158b68",
  },
  {
    id: "advanced",
    name: "Advanced computing",
    description: "At least 18 units of 3000-level COMP courses",
    total: 18,
    colour: "#ca7b16",
  },
  {
    id: "electives",
    name: "University electives",
    description: "Courses chosen from across ANU",
    total: 24,
    colour: "#e05f7e",
  },
];

export function courseByCode(code: string) {
  return courses.find((course) => course.code === code);
}

/** Direct prerequisites followed by every earlier prerequisite in the chain. */
export function prerequisiteChainCodes(code: string) {
  const result: string[] = [];
  const visited = new Set<string>();

  const visit = (courseCode: string) => {
    const course = courseByCode(courseCode);
    if (!course) return;
    for (const prerequisite of course.prerequisiteCodes) {
      if (visited.has(prerequisite)) continue;
      visited.add(prerequisite);
      result.push(prerequisite);
      visit(prerequisite);
    }
  };

  visit(code);
  return result;
}

export function courseOccurrenceLimit(code: string) {
  return courseByCode(code)?.units === 12 ? 2 : 1;
}

export function degreeByCode(code: string) {
  return degrees.find((degree) => degree.code === code) ?? degrees[0];
}

export function majorByCode(code: string) {
  return majors.find((major) => major.code === code) ?? majors[0];
}
