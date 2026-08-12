"use client";

import Link from "next/link";
import {
  ArrowRight,
  FilterX,
  Grid2X2,
  List,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { TermChooser } from "@/components/course-overlays";
import { Course, courses } from "@/lib/catalogue";

export default function CoursesPage() {
  const { state, updateProfile } = useCoursemap();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [level, setLevel] = useState("All levels");
  const [session, setSession] = useState("All sessions");
  const [convener, setConvener] = useState("All conveners");
  const [view, setView] = useState<"list" | "grid">("list");
  const [planCourse, setPlanCourse] = useState<Course | null>(null);

  const subjects = [...new Set(courses.map((course) => course.subject))].sort();
  const conveners = [...new Set(courses.map((course) => course.convener))].sort();
  const filtered = useMemo(
    () => courses.filter((course) => {
      const text = `${course.code} ${course.name} ${course.school} ${course.convener}`.toLowerCase();
      return (
        text.includes(query.toLowerCase()) &&
        (subject === "All subjects" || course.subject === subject) &&
        (level === "All levels" || String(course.level / 1000) === level) &&
        (session === "All sessions" || course.sessions.includes(session)) &&
        (convener === "All conveners" || course.convener === convener)
      );
    }),
    [query, subject, level, session, convener],
  );

  const clear = () => {
    setQuery("");
    setSubject("All subjects");
    setLevel("All levels");
    setSession("All sessions");
    setConvener("All conveners");
  };

  return (
    <AppShell title="Courses" subtitle={`${state.profile.catalogueYear} catalogue`}>
      <div className="content-width courses-page">
        <section className="page-heading compact">
          <div><span className="eyebrow">Course catalogue</span><h1>Find what fits your plan.</h1><p>Search by course, school or convener, then check the rules before adding it.</p></div>
          <label className="year-control large">
            <span>Academic year</span>
            <select value={state.profile.catalogueYear} onChange={(event) => updateProfile({ catalogueYear: Number(event.target.value) })}>
              <option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option>
            </select>
          </label>
        </section>

        <section className="catalogue-panel">
          <div className="catalogue-search">
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, course name, school or convener" aria-label="Search course catalogue" />
            <span>{filtered.length} results</span>
          </div>
          <div className="catalogue-toolbar">
            <div className="filter-row">
              <label><span>Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)}><option>All subjects</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option>All levels</option><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option></select></label>
              <label><span>Session</span><select value={session} onChange={(event) => setSession(event.target.value)}><option>All sessions</option><option>Semester 1</option><option>Semester 2</option></select></label>
              <label><span>Convener</span><select value={convener} onChange={(event) => setConvener(event.target.value)}><option>All conveners</option>{conveners.map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="button ghost filter-clear" type="button" onClick={clear}><FilterX size={15} /> Clear</button>
            </div>
            <div className="view-switch" role="group" aria-label="Catalogue view">
              <button className={view === "list" ? "active" : ""} type="button" onClick={() => setView("list")} aria-label="List view"><List size={17} /></button>
              <button className={view === "grid" ? "active" : ""} type="button" onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={17} /></button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><Search size={27} /><strong>No courses found</strong><p>Try removing one of your filters.</p><button className="button secondary" type="button" onClick={clear}>Clear all filters</button></div>
          ) : view === "list" ? (
            <div className="catalogue-list">
              <div className="catalogue-list-head"><span>Course</span><span>Teaching</span><span>Convener</span><span>Rules</span><span /></div>
              {filtered.map((course) => (
                <article className="catalogue-row" key={course.code}>
                  <Link className="catalogue-name" href={`/courses/${course.code}`}>
                    <span className={`course-token ${course.accent}`}>{course.code.slice(0, 2)}</span>
                    <span><strong>{course.name}</strong><small>{course.code} · {course.subject}</small></span>
                  </Link>
                  <span className="catalogue-teaching"><strong>{course.units} units · Level {course.level / 1000}</strong><small>{course.sessions.join(" · ")} · {course.delivery}</small></span>
                  <span className="catalogue-convener"><UserRound size={15} /><span><strong>{course.convener}</strong><small>{course.school}</small></span></span>
                  <span className="catalogue-rules"><i className={course.prerequisiteCodes.length ? "badge warning" : "badge success"}>{course.prerequisiteCodes.length ? `${course.prerequisiteCodes.length} prerequisite${course.prerequisiteCodes.length > 1 ? "s" : ""}` : "Open entry"}</i>{course.incompatibilities.length > 0 && <small>{course.incompatibilities.length} incompatible</small>}</span>
                  <span className="row-actions"><button className="icon-button" type="button" onClick={() => setPlanCourse(course)} aria-label={`Add ${course.code} to plan`}><Plus size={17} /></button><Link className="icon-button" href={`/courses/${course.code}`} aria-label={`View ${course.code}`}><ArrowRight size={17} /></Link></span>
                </article>
              ))}
            </div>
          ) : (
            <div className="catalogue-grid">
              {filtered.map((course) => (
                <article className="catalogue-card" key={course.code}>
                  <div><span className={`course-token ${course.accent}`}>{course.code.slice(0, 2)}</span><span className="badge neutral">{course.units} units</span></div>
                  <span className="eyebrow">{course.code} · Level {course.level / 1000}</span>
                  <h3>{course.name}</h3>
                  <p>{course.description}</p>
                  <dl><div><dt>Offered</dt><dd>{course.sessions.join(", ")}</dd></div><div><dt>Convener</dt><dd>{course.convener}</dd></div></dl>
                  <div className="card-actions"><button className="button secondary" type="button" onClick={() => setPlanCourse(course)}><Plus size={15} /> Add</button><Link className="button ghost" href={`/courses/${course.code}`}>Details <ArrowRight size={15} /></Link></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      {planCourse && <TermChooser course={planCourse} onClose={() => setPlanCourse(null)} />}
    </AppShell>
  );
}
