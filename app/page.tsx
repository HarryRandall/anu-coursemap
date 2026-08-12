"use client";

import { useMemo, useState } from "react";

type AttemptStatus = "completed" | "failed" | "planned" | "enrolled";
type ViewMode = "roadmap" | "requirements" | "history";

type Course = {
  id: string;
  name: string;
  units: number;
  level: number;
  offered: string;
  description: string;
  prerequisiteIds: string[];
  prerequisiteText: string;
  requiresPermission?: boolean;
  countsTowards: string[];
  accent: "blue" | "violet" | "mint" | "amber" | "rose";
};

type Attempt = {
  id: string;
  courseId: string;
  termId: string;
  status: AttemptStatus;
  mark?: number;
};

type Term = {
  id: string;
  year: number;
  semester: string;
  subtitle: string;
};

const courses: Course[] = [
  {
    id: "COMP1100",
    name: "Programming as Problem Solving",
    units: 6,
    level: 1000,
    offered: "Semester 1",
    description:
      "A first course in programming, computational thinking and systematic problem solving.",
    prerequisiteIds: [],
    prerequisiteText: "No prerequisites",
    countsTowards: ["Computing core", "Software Development major"],
    accent: "blue",
  },
  {
    id: "MATH1005",
    name: "Discrete Mathematical Models",
    units: 6,
    level: 1000,
    offered: "Semester 1 · Semester 2",
    description:
      "Discrete structures and mathematical reasoning used throughout computing.",
    prerequisiteIds: [],
    prerequisiteText: "No prerequisites",
    countsTowards: ["Mathematics requirement", "Degree core"],
    accent: "violet",
  },
  {
    id: "COMP1110",
    name: "Structured Programming",
    units: 6,
    level: 1000,
    offered: "Semester 2",
    description:
      "Object-oriented design, data structures and larger-scale programming practice.",
    prerequisiteIds: ["COMP1100"],
    prerequisiteText: "Completion of COMP1100 or COMP1130",
    countsTowards: ["Computing core", "Software Development major"],
    accent: "mint",
  },
  {
    id: "COMP2100",
    name: "Software Design Methodologies",
    units: 6,
    level: 2000,
    offered: "Semester 1",
    description:
      "Techniques for designing, testing and maintaining reliable software systems.",
    prerequisiteIds: ["COMP1110"],
    prerequisiteText: "Successful completion of COMP1110",
    countsTowards: ["Computing core", "Software Development major"],
    accent: "amber",
  },
  {
    id: "COMP3900",
    name: "Computing Project",
    units: 12,
    level: 3000,
    offered: "Semester 1 · Semester 2",
    description:
      "A substantial team project integrating technical knowledge and professional practice.",
    prerequisiteIds: ["COMP2100"],
    prerequisiteText: "96 units completed, including COMP2100, and permission",
    requiresPermission: true,
    countsTowards: ["Capstone", "3000-level computing requirement"],
    accent: "rose",
  },
];

const initialAttempts: Attempt[] = [
  {
    id: "attempt-comp1100-2026-s1",
    courseId: "COMP1100",
    termId: "2026-s1",
    status: "completed",
    mark: 78,
  },
  {
    id: "attempt-math1005-2026-s1",
    courseId: "MATH1005",
    termId: "2026-s1",
    status: "completed",
    mark: 72,
  },
  {
    id: "attempt-comp1110-2026-s2",
    courseId: "COMP1110",
    termId: "2026-s2",
    status: "failed",
    mark: 43,
  },
  {
    id: "attempt-comp1110-2027-s1",
    courseId: "COMP1110",
    termId: "2027-s1",
    status: "planned",
  },
  {
    id: "attempt-comp2100-2027-s2",
    courseId: "COMP2100",
    termId: "2027-s2",
    status: "planned",
  },
  {
    id: "attempt-comp3900-2028-s2",
    courseId: "COMP3900",
    termId: "2028-s2",
    status: "planned",
  },
];

const terms: Term[] = [
  { id: "2026-s1", year: 2026, semester: "Semester 1", subtitle: "Feb – Jun" },
  { id: "2026-s2", year: 2026, semester: "Semester 2", subtitle: "Jul – Nov" },
  { id: "2027-s1", year: 2027, semester: "Semester 1", subtitle: "Feb – Jun" },
  { id: "2027-s2", year: 2027, semester: "Semester 2", subtitle: "Jul – Nov" },
  { id: "2028-s1", year: 2028, semester: "Semester 1", subtitle: "Feb – Jun" },
  { id: "2028-s2", year: 2028, semester: "Semester 2", subtitle: "Jul – Nov" },
];

const majors = [
  {
    id: "software",
    name: "Software Development",
    progress: 12,
    colour: "#5b5bd6",
    description: "Design, build and maintain dependable software systems.",
  },
  {
    id: "cyber",
    name: "Cyber Security",
    progress: 6,
    colour: "#0891b2",
    description: "Secure systems, networks and information infrastructure.",
  },
  {
    id: "data",
    name: "Data Science",
    progress: 6,
    colour: "#059669",
    description: "Turn complex data into useful models and decisions.",
  },
  {
    id: "ai",
    name: "Intelligent Systems",
    progress: 6,
    colour: "#d97706",
    description: "Build systems that learn, reason and act autonomously.",
  },
  {
    id: "theory",
    name: "Theoretical Computer Science",
    progress: 12,
    colour: "#e11d48",
    description: "Explore computation through logic, algorithms and complexity.",
  },
];

const requirementRows = [
  {
    name: "Computing core",
    detail: "Eight compulsory computing courses",
    complete: 12,
    total: 48,
  },
  {
    name: "Mathematics requirement",
    detail: "Six units from an approved mathematics list",
    complete: 6,
    total: 6,
  },
  {
    name: "Selected major",
    detail: "Complete one 48-unit computing major",
    complete: 12,
    total: 48,
  },
  {
    name: "Advanced computing",
    detail: "At least 18 units of 3000-level COMP courses",
    complete: 0,
    total: 18,
  },
  {
    name: "University electives",
    detail: "Courses from across ANU",
    complete: 0,
    total: 24,
  },
];

const navItems = [
  ["roadmap", "Roadmap", "⌘"],
  ["requirements", "Requirements", "◫"],
  ["explore", "Explore", "⌕"],
  ["rules", "Rule library", "◇"],
];

function courseById(id: string) {
  return courses.find((course) => course.id === id)!;
}

export default function Home() {
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  const [selectedAttemptId, setSelectedAttemptId] = useState(
    "attempt-comp2100-2027-s2",
  );
  const [view, setView] = useState<ViewMode>("roadmap");
  const [activeNav, setActiveNav] = useState("roadmap");
  const [selectedMajorId, setSelectedMajorId] = useState("software");
  const [modal, setModal] = useState<"major" | "course" | "search" | null>(null);
  const [targetTermId, setTargetTermId] = useState("2027-s1");
  const [catalogueYear, setCatalogueYear] = useState("2026");
  const [approvedPermissions, setApprovedPermissions] = useState<string[]>([]);
  const [overload, setOverload] = useState(false);
  const [overloadApproved, setOverloadApproved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selectedAttempt =
    attempts.find((attempt) => attempt.id === selectedAttemptId) ?? attempts[0];
  const selectedCourse = courseById(selectedAttempt.courseId);
  const selectedMajor = majors.find((major) => major.id === selectedMajorId)!;

  const completedCourseIds = useMemo(
    () =>
      new Set(
        attempts
          .filter((attempt) => attempt.status === "completed")
          .map((attempt) => attempt.courseId),
      ),
    [attempts],
  );

  const completedUnits = useMemo(
    () =>
      [...completedCourseIds].reduce(
        (total, id) => total + courseById(id).units,
        0,
      ),
    [completedCourseIds],
  );

  const mappedUnits = useMemo(() => {
    const latest = new Map<string, Attempt>();
    attempts
      .filter((attempt) => attempt.status !== "failed")
      .forEach((attempt) => latest.set(attempt.courseId, attempt));
    return [...latest.values()].reduce(
      (total, attempt) => total + courseById(attempt.courseId).units,
      0,
    );
  }, [attempts]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const effectiveStatus = (attempt: Attempt) => {
    if (attempt.status !== "planned") return attempt.status;
    const course = courseById(attempt.courseId);
    if (
      course.prerequisiteIds.some(
        (courseId) => !completedCourseIds.has(courseId),
      )
    ) {
      return "blocked";
    }
    if (
      course.requiresPermission &&
      !approvedPermissions.includes(course.id)
    ) {
      return "approval";
    }
    return "planned";
  };

  const selectCourse = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
  };

  const updateSelectedAttempt = (status: AttemptStatus) => {
    setAttempts((current) =>
      current.map((attempt) =>
        attempt.id === selectedAttempt.id
          ? {
              ...attempt,
              status,
              mark:
                status === "completed"
                  ? attempt.mark ?? 68
                  : status === "failed"
                    ? attempt.mark ?? 42
                    : undefined,
            }
          : attempt,
      ),
    );
    showToast(
      status === "completed"
        ? `${selectedCourse.id} marked as completed`
        : status === "failed"
          ? `${selectedCourse.id} recorded as a failed attempt`
          : `${selectedCourse.id} moved back to planned`,
    );
  };

  const addCourse = (courseId: string) => {
    const alreadyInTerm = attempts.some(
      (attempt) =>
        attempt.termId === targetTermId && attempt.courseId === courseId,
    );
    if (alreadyInTerm) {
      showToast(`${courseId} is already in this semester`);
      return;
    }
    const newAttempt: Attempt = {
      id: `attempt-${courseId.toLowerCase()}-${targetTermId}-${Date.now()}`,
      courseId,
      termId: targetTermId,
      status: "planned",
    };
    setAttempts((current) => [...current, newAttempt]);
    setSelectedAttemptId(newAttempt.id);
    setModal(null);
    setQuery("");
    showToast(`${courseId} added to the roadmap`);
  };

  const removeSelectedAttempt = () => {
    if (selectedAttempt.status === "completed") {
      showToast("Completed attempts stay in your academic history");
      return;
    }
    setAttempts((current) =>
      current.filter((attempt) => attempt.id !== selectedAttempt.id),
    );
    const next = attempts.find((attempt) => attempt.id !== selectedAttempt.id);
    if (next) setSelectedAttemptId(next.id);
    showToast(`${selectedCourse.id} removed from the plan`);
  };

  const filteredCourses = courses.filter((course) =>
    `${course.id} ${course.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  const openCoursePicker = (termId: string) => {
    setTargetTermId(termId);
    setQuery("");
    setModal("course");
  };

  const handleNav = (id: string) => {
    setActiveNav(id);
    if (id === "roadmap") setView("roadmap");
    if (id === "requirements") setView("requirements");
    if (id === "explore") setModal("major");
    if (id === "rules") {
      setView("requirements");
      showToast("Showing the rules behind this plan");
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand-name">coursemap</span>
          <span className="beta-pill">beta</span>
        </div>

        <button className="workspace-switcher" type="button">
          <span className="anu-avatar">ANU</span>
          <span>
            <strong>My degree</strong>
            <small>Personal workspace</small>
          </span>
          <span className="chevrons" aria-hidden="true">⌃⌄</span>
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-label">Plan</p>
          {navItems.map(([id, label, icon]) => (
            <button
              className={activeNav === id ? "nav-item active" : "nav-item"}
              key={id}
              onClick={() => handleNav(id)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              <span>{label}</span>
              {id === "requirements" && <span className="nav-count">1</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-degree-card">
          <div className="degree-card-heading">
            <span className="degree-glyph">BC</span>
            <span>
              <strong>Bachelor of Computing</strong>
              <small>Commenced 2026</small>
            </span>
          </div>
          <div className="mini-progress-track">
            <span style={{ width: `${Math.max(8, completedUnits / 1.44)}%` }} />
          </div>
          <div className="mini-progress-copy">
            <span>{completedUnits} of 144 units</span>
            <strong>{Math.round((completedUnits / 144) * 100)}%</strong>
          </div>
        </div>

        <div className="sidebar-spacer" />
        <button className="sidebar-utility" type="button">
          <span aria-hidden="true">?</span> Help & feedback
        </button>
        <button className="profile-row" type="button">
          <span className="profile-avatar">HS</span>
          <span>
            <strong>Harry Student</strong>
            <small>u7499609</small>
          </span>
          <span className="profile-more" aria-hidden="true">•••</span>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Bachelor of Computing</span>
            <span aria-hidden="true">/</span>
            <button type="button" onClick={() => setModal("major")}>{selectedMajor.name}</button>
          </div>
          <div className="topbar-actions">
            <span className="sync-chip"><i /> Catalogue synced today</span>
            <button
              className="search-trigger"
              type="button"
              onClick={() => {
                setQuery("");
                setModal("search");
              }}
            >
              <span aria-hidden="true">⌕</span>
              <span>Search courses</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="ghost-icon-button"
              type="button"
              aria-label="Notifications"
            >
              ◌
              <i />
            </button>
            <button
              className="primary-button compact"
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                showToast("Private plan link copied");
              }}
            >
              Share plan <span aria-hidden="true">↗</span>
            </button>
          </div>
        </header>

        <div className="page-scroll">
          <section className="page-heading">
            <div>
              <div className="eyebrow-row">
                <span className="live-dot" />
                <span>Planning workspace</span>
              </div>
              <h1>Your degree, mapped.</h1>
              <p>
                See what counts, what unlocks next and where every course fits.
              </p>
            </div>
            <div className="heading-actions">
              <label className="catalogue-select">
                <span>Rules</span>
                <select
                  value={catalogueYear}
                  onChange={(event) => setCatalogueYear(event.target.value)}
                  aria-label="Catalogue year"
                >
                  <option>2024</option>
                  <option>2025</option>
                  <option>2026</option>
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={() => setModal("major")}>
                Change major
              </button>
              <button className="primary-button" type="button" onClick={() => openCoursePicker("2027-s1")}>
                <span aria-hidden="true">＋</span> Add course
              </button>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Degree summary">
            <article className="metric-card metric-featured">
              <div className="metric-label-row">
                <span>Degree progress</span>
                <span className="status-pill success">On track</span>
              </div>
              <div className="metric-value-row">
                <strong>{completedUnits}</strong>
                <span>/ 144 units</span>
              </div>
              <div className="progress-track large">
                <span style={{ width: `${Math.max(8, completedUnits / 1.44)}%` }} />
              </div>
              <small>{mappedUnits} units mapped across your roadmap</small>
            </article>
            <article className="metric-card">
              <div className="metric-label-row">
                <span>Selected major</span>
                <button type="button" onClick={() => setModal("major")}>Edit</button>
              </div>
              <div className="major-metric">
                <span className="major-swatch" style={{ background: selectedMajor.colour }} />
                <strong>{selectedMajor.name}</strong>
              </div>
              <p>{selectedMajor.progress} of 48 units completed</p>
              <div className="progress-track subtle">
                <span
                  style={{
                    width: `${(selectedMajor.progress / 48) * 100}%`,
                    background: selectedMajor.colour,
                  }}
                />
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-label-row">
                <span>Plan health</span>
                <span className="metric-icon">◇</span>
              </div>
              <div className="health-score"><strong>2</strong><span>items to review</span></div>
              <div className="health-list">
                <span><i className="amber-dot" /> 1 prerequisite</span>
                <span><i className="violet-dot" /> 1 approval</span>
              </div>
            </article>
          </section>

          <section className="planner-shell">
            <div className="planner-main">
              <div className="planner-toolbar">
                <div className="segmented-control" role="tablist" aria-label="Planner view">
                  {(["roadmap", "requirements", "history"] as ViewMode[]).map((mode) => (
                    <button
                      role="tab"
                      aria-selected={view === mode}
                      className={view === mode ? "selected" : ""}
                      key={mode}
                      onClick={() => setView(mode)}
                      type="button"
                    >
                      {mode[0].toUpperCase() + mode.slice(1)}
                      {mode === "requirements" && <span>1</span>}
                    </button>
                  ))}
                </div>
                <div className="legend-row" aria-label="Course status legend">
                  <span><i className="legend-dot completed" /> Completed</span>
                  <span><i className="legend-dot planned" /> Planned</span>
                  <span><i className="legend-dot blocked" /> Needs attention</span>
                  <button className="more-button" type="button" aria-label="More planner options">•••</button>
                </div>
              </div>

              {view === "roadmap" && (
                <div className="roadmap-view">
                  <div className="roadmap-intro">
                    <div>
                      <h2>Three-year roadmap</h2>
                      <p>Courses are grouped by progression, not class time.</p>
                    </div>
                    <button
                      className={overload ? "scenario-button active" : "scenario-button"}
                      type="button"
                      onClick={() => {
                        setOverload((current) => !current);
                        setOverloadApproved(false);
                      }}
                    >
                      {overload ? "Remove overload scenario" : "Simulate overload"}
                    </button>
                  </div>

                  <div className="roadmap-years">
                    {[2026, 2027, 2028].map((year) => (
                      <section className="year-section" key={year}>
                        <div className="year-rail">
                          <span>YEAR {year - 2025}</span>
                          <strong>{year}</strong>
                          <small>{year === 2026 ? "Foundation" : year === 2027 ? "Development" : "Specialisation"}</small>
                        </div>
                        <div className="semester-grid">
                          {terms
                            .filter((term) => term.year === year)
                            .map((term) => {
                              const termAttempts = attempts.filter(
                                (attempt) => attempt.termId === term.id,
                              );
                              const isOverloadTerm = overload && term.id === "2027-s1";
                              const termUnits = termAttempts.reduce(
                                (sum, attempt) =>
                                  sum +
                                  (attempt.status === "failed"
                                    ? 0
                                    : courseById(attempt.courseId).units),
                                0,
                              ) + (isOverloadTerm ? 24 : 0);
                              return (
                                <article className={isOverloadTerm ? "semester-column overload" : "semester-column"} key={term.id}>
                                  <div className="semester-heading">
                                    <span>
                                      <strong>{term.semester}</strong>
                                      <small>{term.subtitle}</small>
                                    </span>
                                    <span className={termUnits > 24 ? "unit-pill warning" : "unit-pill"}>
                                      {termUnits} units
                                    </span>
                                  </div>
                                  <div className="course-stack">
                                    {termAttempts.map((attempt) => {
                                      const course = courseById(attempt.courseId);
                                      const status = effectiveStatus(attempt);
                                      return (
                                        <button
                                          className={`course-card ${course.accent} ${status} ${selectedAttemptId === attempt.id ? "selected" : ""}`}
                                          key={attempt.id}
                                          onClick={() => selectCourse(attempt.id)}
                                          type="button"
                                        >
                                          <span className="course-card-topline">
                                            <strong>{course.id}</strong>
                                            <span className={`course-state ${status}`}>
                                              {status === "completed" && "✓ Completed"}
                                              {status === "failed" && "Failed"}
                                              {status === "blocked" && "Blocked"}
                                              {status === "approval" && "Approval"}
                                              {status === "planned" && "Planned"}
                                              {status === "enrolled" && "In progress"}
                                            </span>
                                          </span>
                                          <span className="course-title">{course.name}</span>
                                          <span className="course-meta">
                                            <span>{course.units} units</span>
                                            <span>Level {course.level / 1000}</span>
                                          </span>
                                          {(status === "blocked" || status === "approval") && (
                                            <span className="course-alert-line">
                                              <i />
                                              {status === "blocked" ? "Prerequisite not met" : "Permission required"}
                                            </span>
                                          )}
                                          {status === "failed" && (
                                            <span className="course-alert-line failed-copy">
                                              Attempt retained · repeat planned
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}

                                    {isOverloadTerm && (
                                      <div className="overload-placeholder">
                                        <span className="overload-icon">↗</span>
                                        <span>
                                          <strong>Proposed 30-unit load</strong>
                                          <small>{overloadApproved ? "Overload approval recorded" : "Extra 24 units require approval"}</small>
                                        </span>
                                        <span className={overloadApproved ? "mini-status approved" : "mini-status"}>
                                          {overloadApproved ? "Approved" : "Review"}
                                        </span>
                                      </div>
                                    )}

                                    {termAttempts.length + (isOverloadTerm ? 3 : 0) < 4 && (
                                      <button
                                        className="empty-course-slot"
                                        onClick={() => openCoursePicker(term.id)}
                                        type="button"
                                      >
                                        <span aria-hidden="true">＋</span>
                                        <span>
                                          <strong>Add a course</strong>
                                          <small>Core, major or elective</small>
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}

              {view === "requirements" && (
                <div className="requirements-view">
                  <div className="requirements-heading">
                    <div>
                      <h2>Degree requirements</h2>
                      <p>Interpreted from the {catalogueYear} Bachelor of Computing rules.</p>
                    </div>
                    <span className="verified-badge">✓ 5 rule groups verified</span>
                  </div>
                  <div className="requirement-list">
                    {requirementRows.map((requirement) => {
                      const complete =
                        requirement.name === "Selected major"
                          ? selectedMajor.progress
                          : requirement.complete;
                      const percentage = Math.min(
                        100,
                        (complete / requirement.total) * 100,
                      );
                      return (
                        <article className="requirement-row" key={requirement.name}>
                          <span className={percentage === 100 ? "requirement-check done" : "requirement-check"}>
                            {percentage === 100 ? "✓" : ""}
                          </span>
                          <div className="requirement-copy">
                            <strong>{requirement.name}</strong>
                            <small>{requirement.detail}</small>
                          </div>
                          <div className="requirement-progress">
                            <span><i style={{ width: `${percentage}%` }} /></span>
                            <small>{complete} / {requirement.total} units</small>
                          </div>
                          <button type="button" aria-label={`Open ${requirement.name}`}>→</button>
                        </article>
                      );
                    })}
                  </div>
                  <article className="source-card">
                    <span className="source-icon">◇</span>
                    <div>
                      <strong>Every decision keeps its source</strong>
                      <p>Parsed rules retain the original ANU wording, catalogue year and review status.</p>
                    </div>
                    <button type="button" onClick={() => showToast("Official source opened in a new tab")}>View source ↗</button>
                  </article>
                </div>
              )}

              {view === "history" && (
                <div className="history-view">
                  <div className="requirements-heading">
                    <div>
                      <h2>Course history</h2>
                      <p>Attempts remain separate so failures never award units or disappear.</p>
                    </div>
                    <span className="verified-badge neutral">6 recorded attempts</span>
                  </div>
                  <div className="attempt-table" role="table" aria-label="Course attempts">
                    <div className="attempt-table-head" role="row">
                      <span>Course</span><span>Study period</span><span>Result</span><span>Units earned</span><span />
                    </div>
                    {attempts.map((attempt) => {
                      const course = courseById(attempt.courseId);
                      const term = terms.find((item) => item.id === attempt.termId)!;
                      return (
                        <button
                          className="attempt-table-row"
                          key={attempt.id}
                          onClick={() => selectCourse(attempt.id)}
                          type="button"
                          role="row"
                        >
                          <span><strong>{course.id}</strong><small>{course.name}</small></span>
                          <span>{term.semester} {term.year}</span>
                          <span className={`result-badge ${attempt.status}`}>
                            {attempt.status === "completed" ? `Passed · ${attempt.mark}` : attempt.status === "failed" ? `Failed · ${attempt.mark}` : "Planned"}
                          </span>
                          <span>{attempt.status === "completed" ? `${course.units} units` : "0 units"}</span>
                          <span>→</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="inspector" aria-label="Selected course details">
              <div className="inspector-header">
                <div>
                  <span className={`course-monogram ${selectedCourse.accent}`}>{selectedCourse.id.slice(0, 2)}</span>
                  <span>
                    <small>Selected course</small>
                    <strong>{selectedCourse.id}</strong>
                  </span>
                </div>
                <button type="button" aria-label="More course actions">•••</button>
              </div>

              <div className="inspector-body">
                <h2>{selectedCourse.name}</h2>
                <p className="course-description">{selectedCourse.description}</p>

                <div className="inspector-facts">
                  <span><small>Units</small><strong>{selectedCourse.units}</strong></span>
                  <span><small>Level</small><strong>{selectedCourse.level}</strong></span>
                  <span><small>Status</small><strong className={`inline-status ${effectiveStatus(selectedAttempt)}`}>{effectiveStatus(selectedAttempt)}</strong></span>
                </div>

                <section className="inspector-section">
                  <div className="section-heading-row">
                    <h3>Eligibility</h3>
                    <span className={effectiveStatus(selectedAttempt) === "blocked" ? "section-state warning" : "section-state"}>
                      {effectiveStatus(selectedAttempt) === "blocked" ? "Needs action" : "Checked"}
                    </span>
                  </div>
                  <div className="rule-card">
                    <span className={selectedCourse.prerequisiteIds.every((id) => completedCourseIds.has(id)) ? "rule-icon met" : "rule-icon unmet"}>
                      {selectedCourse.prerequisiteIds.every((id) => completedCourseIds.has(id)) ? "✓" : "!"}
                    </span>
                    <div>
                      <strong>Prerequisite</strong>
                      <p>{selectedCourse.prerequisiteText}</p>
                      {selectedCourse.prerequisiteIds.length > 0 && (
                        <div className="rule-course-chips">
                          {selectedCourse.prerequisiteIds.map((id) => (
                            <span className={completedCourseIds.has(id) ? "met" : ""} key={id}>
                              {completedCourseIds.has(id) ? "✓ " : ""}{id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedCourse.requiresPermission && (
                    <div className="rule-card">
                      <span className={approvedPermissions.includes(selectedCourse.id) ? "rule-icon met" : "rule-icon permission"}>
                        {approvedPermissions.includes(selectedCourse.id) ? "✓" : "#"}
                      </span>
                      <div>
                        <strong>Permission code</strong>
                        <p>Convener approval is recorded separately from prerequisite completion.</p>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            setApprovedPermissions((current) =>
                              current.includes(selectedCourse.id)
                                ? current.filter((id) => id !== selectedCourse.id)
                                : [...current, selectedCourse.id],
                            );
                            showToast(
                              approvedPermissions.includes(selectedCourse.id)
                                ? "Permission approval removed"
                                : "Permission approval recorded",
                            );
                          }}
                        >
                          {approvedPermissions.includes(selectedCourse.id) ? "Remove approval" : "Mark permission approved"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="inspector-section">
                  <div className="section-heading-row">
                    <h3>Counts towards</h3>
                    <span>{selectedCourse.countsTowards.length}</span>
                  </div>
                  <div className="count-list">
                    {selectedCourse.countsTowards.map((item, index) => (
                      <div key={item}>
                        <span className={index === 0 ? "count-dot violet" : "count-dot blue"} />
                        <span><strong>{item}</strong><small>{index === 0 ? "Primary allocation" : "Also eligible"}</small></span>
                        <span>→</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="inspector-section">
                  <div className="section-heading-row"><h3>Availability</h3></div>
                  <div className="availability-row">
                    <span className="calendar-glyph">□</span>
                    <span><strong>{selectedCourse.offered}</strong><small>Based on {catalogueYear} published offerings</small></span>
                  </div>
                </section>

                {overload && (
                  <section className="inspector-section overload-review">
                    <div className="section-heading-row">
                      <h3>Overload scenario</h3>
                      <span className={overloadApproved ? "section-state approved" : "section-state warning"}>{overloadApproved ? "Approved" : "Approval required"}</span>
                    </div>
                    <p>30 units exceeds the standard 24-unit study load. Eligibility can be checked, but ANU approval is still required.</p>
                    <button
                      className="secondary-button full"
                      type="button"
                      onClick={() => {
                        setOverloadApproved((current) => !current);
                        showToast(overloadApproved ? "Overload approval removed" : "Overload approval recorded");
                      }}
                    >
                      {overloadApproved ? "Remove approval" : "Record approved overload"}
                    </button>
                  </section>
                )}
              </div>

              <div className="inspector-actions">
                {selectedAttempt.status !== "completed" && (
                  <button className="primary-button full" type="button" onClick={() => updateSelectedAttempt("completed")}>
                    ✓ Mark completed
                  </button>
                )}
                {selectedAttempt.status === "completed" && (
                  <button className="secondary-button full" type="button" onClick={() => updateSelectedAttempt("planned")}>
                    Undo completion
                  </button>
                )}
                {selectedAttempt.status !== "failed" && selectedAttempt.status !== "completed" && (
                  <button className="danger-text-button" type="button" onClick={() => updateSelectedAttempt("failed")}>
                    Record failed attempt
                  </button>
                )}
                {selectedAttempt.status === "failed" && (
                  <button className="secondary-button full" type="button" onClick={() => updateSelectedAttempt("planned")}>
                    Change result
                  </button>
                )}
                <button className="quiet-button" type="button" onClick={removeSelectedAttempt}>Remove from plan</button>
              </div>
            </aside>
          </section>
        </div>
      </section>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section
            className={modal === "search" ? "modal command-modal" : "modal"}
            role="dialog"
            aria-modal="true"
            aria-label={modal === "major" ? "Choose a major" : "Choose a course"}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {modal === "major" ? (
              <>
                <div className="modal-heading">
                  <div><span className="modal-kicker">Explore pathways</span><h2>Choose a major</h2><p>See how your completed courses apply before committing.</p></div>
                  <button type="button" onClick={() => setModal(null)} aria-label="Close">×</button>
                </div>
                <div className="major-options">
                  {majors.map((major) => (
                    <button
                      className={selectedMajorId === major.id ? "major-option selected" : "major-option"}
                      key={major.id}
                      type="button"
                      onClick={() => {
                        setSelectedMajorId(major.id);
                        setModal(null);
                        setActiveNav("roadmap");
                        showToast(`${major.name} major selected`);
                      }}
                    >
                      <span className="major-option-icon" style={{ background: `${major.colour}16`, color: major.colour }}>◇</span>
                      <span className="major-option-copy"><strong>{major.name}</strong><small>{major.description}</small></span>
                      <span className="major-option-progress"><strong>{major.progress}/48</strong><small>units already count</small></span>
                      <span className="major-option-arrow">{selectedMajorId === major.id ? "✓" : "→"}</span>
                    </button>
                  ))}
                </div>
                <div className="modal-footer-note">Changing this selection only updates your plan. It does not change your official ANU enrolment.</div>
              </>
            ) : (
              <>
                <div className="command-search-row">
                  <span aria-hidden="true">⌕</span>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by course code or name..."
                    aria-label="Search courses"
                  />
                  <button type="button" onClick={() => setModal(null)}>ESC</button>
                </div>
                <div className="command-context-row">
                  <span>{modal === "course" ? `Add to ${terms.find((term) => term.id === targetTermId)?.semester} ${terms.find((term) => term.id === targetTermId)?.year}` : "Course catalogue"}</span>
                  <span>{filteredCourses.length} results</span>
                </div>
                <div className="course-results">
                  {filteredCourses.map((course) => {
                    const unmet = course.prerequisiteIds.some((id) => !completedCourseIds.has(id));
                    return (
                      <button key={course.id} type="button" onClick={() => modal === "course" ? addCourse(course.id) : (() => {
                        const existing = attempts.find((attempt) => attempt.courseId === course.id);
                        if (existing) setSelectedAttemptId(existing.id);
                        setModal(null);
                        showToast(existing ? `${course.id} selected` : `${course.id} is not in the plan yet`);
                      })()}>
                        <span className={`result-monogram ${course.accent}`}>{course.id.slice(0, 2)}</span>
                        <span className="result-course-copy"><strong>{course.id}</strong><small>{course.name}</small></span>
                        <span className="result-tags"><i>{course.units} units</i><i>Level {course.level / 1000}</i>{unmet && <i className="warning">Prerequisite</i>}</span>
                        <span className="result-arrow">→</span>
                      </button>
                    );
                  })}
                </div>
                <div className="command-footer"><span>↑↓ Navigate</span><span>↵ Select</span><span>Esc Close</span></div>
              </>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
