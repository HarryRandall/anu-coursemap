"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookMarked,
  CalendarDays,
  Check,
  ExternalLink,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { Course, courseByCode, courses, terms } from "@/lib/catalogue";
import { completedCodes, effectiveStatus, statusLabel } from "@/lib/planner";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
}

export function CoursePicker({
  termId,
  onClose,
}: {
  termId: string;
  onClose: () => void;
}) {
  const { state, addCourse, notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [level, setLevel] = useState("All levels");
  const [convener, setConvener] = useState("All conveners");
  const [selected, setSelected] = useState<Course | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const term = terms.find((item) => item.id === termId) ?? terms[0];

  useEscape(onClose);
  useEffect(() => searchRef.current?.focus(), []);

  const subjects = [...new Set(courses.map((course) => course.subject))].sort();
  const conveners = [...new Set(courses.map((course) => course.convener))].sort();
  const filtered = useMemo(
    () =>
      courses.filter((course) => {
        const matchesQuery = `${course.code} ${course.name}`.toLowerCase().includes(query.toLowerCase());
        const matchesSubject = subject === "All subjects" || course.subject === subject;
        const matchesLevel = level === "All levels" || String(course.level / 1000) === level;
        const matchesConvener = convener === "All conveners" || course.convener === convener;
        return matchesQuery && matchesSubject && matchesLevel && matchesConvener;
      }),
    [query, subject, level, convener],
  );

  const choose = (course: Course) => {
    const result = addCourse(course.code, termId);
    notify(result.message);
    if (result.ok) onClose();
  };

  return (
    <div className="overlay-layer">
      <button className="overlay-dismiss" type="button" aria-label="Close course picker" onClick={onClose} />
      <section className="course-picker" role="dialog" aria-modal="true" aria-labelledby="course-picker-title">
        <header className="picker-header">
          <div>
            <span className="eyebrow">Add to {term.name} {term.year < 2029 ? term.year : ""}</span>
            <h2 id="course-picker-title">Find a course</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close course picker">
            <X size={18} />
          </button>
        </header>

        <div className="picker-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by course code or name"
            aria-label="Search courses"
          />
          <span>{filtered.length} courses</span>
        </div>

        <div className="filter-row picker-filters">
          <label>
            <span>Subject</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option>All subjects</option>
              {subjects.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option>All levels</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>
          </label>
          <label>
            <span>Convener</span>
            <select value={convener} onChange={(event) => setConvener(event.target.value)}>
              <option>All conveners</option>
              {conveners.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className="picker-body">
          <div className="picker-results" role="listbox" aria-label="Course results">
            {filtered.map((course) => {
              const planned = state.attempts.some(
                (attempt) => attempt.courseCode === course.code && attempt.status !== "failed",
              );
              const available = course.sessions.includes(term.name) || term.id === "unscheduled";
              return (
                <button
                  key={course.code}
                  className={selected?.code === course.code ? "picker-result selected" : "picker-result"}
                  type="button"
                  role="option"
                  aria-selected={selected?.code === course.code}
                  onClick={() => setSelected(course)}
                  onDoubleClick={() => choose(course)}
                >
                  <span className={`course-token ${course.accent}`}>{course.code.slice(0, 2)}</span>
                  <span className="picker-result-name">
                    <strong>{course.name}</strong>
                    <small>{course.code} · {course.school}</small>
                  </span>
                  <span className="picker-result-meta">
                    <strong>{course.units} units</strong>
                    <small>{course.convener}</small>
                  </span>
                  <span className={available ? "availability yes" : "availability no"}>
                    {planned ? "In plan" : available ? term.shortName : "Not offered"}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="empty-state compact">
                <Search size={22} />
                <strong>No courses match those filters</strong>
                <button type="button" onClick={() => { setQuery(""); setSubject("All subjects"); setLevel("All levels"); setConvener("All conveners"); }}>
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <aside className="picker-preview">
            {selected ? (
              <>
                <span className={`course-token large ${selected.accent}`}>{selected.code.slice(0, 2)}</span>
                <p className="eyebrow">{selected.code}</p>
                <h3>{selected.name}</h3>
                <p>{selected.description}</p>
                <dl>
                  <div><dt>Convener</dt><dd>{selected.convener}</dd></div>
                  <div><dt>Offered</dt><dd>{selected.sessions.join(", ")}</dd></div>
                  <div><dt>Level</dt><dd>{selected.level}</dd></div>
                  <div><dt>Requisite</dt><dd>{selected.prerequisiteText}</dd></div>
                </dl>
                <button className="button primary full" type="button" onClick={() => choose(selected)}>
                  <Plus size={16} /> Add to {term.shortName}
                </button>
                <Link className="button subtle full" href={`/courses/${selected.code}`}>
                  View full course <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <div className="preview-placeholder">
                <BookMarked size={25} />
                <strong>Select a course</strong>
                <p>See its convener, offering and prerequisites before adding it.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

export function CourseDrawer({
  attemptId,
  onClose,
}: {
  attemptId: string;
  onClose: () => void;
}) {
  const {
    state,
    moveAttempt,
    updateAttempt,
    removeAttempt,
    togglePermission,
    notify,
  } = useCoursemap();
  const closeRef = useRef<HTMLButtonElement>(null);
  const attempt = state.attempts.find((item) => item.id === attemptId);
  const course = attempt ? courseByCode(attempt.courseCode) : undefined;
  const completed = completedCodes(state.attempts);
  const status = attempt ? effectiveStatus(attempt, state.attempts) : "planned";

  useEscape(onClose);
  useEffect(() => closeRef.current?.focus(), []);
  if (!attempt || !course) return null;

  const prereqsMet = course.prerequisiteCodes.every((code) => completed.has(code));
  const remove = () => {
    const result = removeAttempt(attempt.id);
    notify(result.message);
    if (result.ok) onClose();
  };

  return (
    <div className="drawer-layer">
      <button className="drawer-dismiss" type="button" aria-label="Close course details" onClick={onClose} />
      <aside className="course-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <div>
            <span className={`course-token ${course.accent}`}>{course.code.slice(0, 2)}</span>
            <span>
              <small>{course.code}</small>
              <strong>{statusLabel(status)}</strong>
            </span>
          </div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Close course details">
            <X size={18} />
          </button>
        </header>

        <div className="drawer-scroll">
          <div className="drawer-title-block">
            <h2 id="drawer-title">{course.name}</h2>
            <p>{course.description}</p>
          </div>

          <div className="fact-strip">
            <span><small>Units</small><strong>{course.units}</strong></span>
            <span><small>Level</small><strong>{course.level}</strong></span>
            <span><small>Offered</small><strong>{course.sessions.map((item) => item.replace("Semester ", "S")).join(" · ")}</strong></span>
          </div>

          <section className="drawer-section">
            <div className="section-title">
              <h3>Eligibility</h3>
              <span className={prereqsMet ? "badge success" : "badge warning"}>{prereqsMet ? "Met" : "Action needed"}</span>
            </div>
            <div className="eligibility-card">
              <span className={prereqsMet ? "eligibility-icon success" : "eligibility-icon warning"}>
                {prereqsMet ? <Check size={17} /> : <AlertTriangle size={17} />}
              </span>
              <span>
                <strong>Prerequisite</strong>
                <p>{course.prerequisiteText}</p>
                {course.prerequisiteCodes.length > 0 && (
                  <span className="code-chips">
                    {course.prerequisiteCodes.map((code) => (
                      <i className={completed.has(code) ? "met" : ""} key={code}>{completed.has(code) ? "✓ " : ""}{code}</i>
                    ))}
                  </span>
                )}
              </span>
            </div>
            {course.incompatibilities.length > 0 && (
              <div className="eligibility-card neutral">
                <span className="eligibility-icon neutral"><X size={17} /></span>
                <span><strong>Incompatible with</strong><p>{course.incompatibilities.join(", ")}</p></span>
              </div>
            )}
            {course.permissionText && (
              <div className="eligibility-card permission">
                <span className={attempt.permissionApproved ? "eligibility-icon success" : "eligibility-icon permission"}>
                  <ShieldCheck size={17} />
                </span>
                <span>
                  <strong>Permission code</strong>
                  <p>{course.permissionText}</p>
                  <button className="text-link" type="button" onClick={() => { togglePermission(attempt.id); notify(attempt.permissionApproved ? "Permission removed" : "Permission approval recorded"); }}>
                    {attempt.permissionApproved ? "Remove approval" : "Record approval"}
                  </button>
                </span>
              </div>
            )}
          </section>

          <section className="drawer-section">
            <div className="section-title"><h3>Course information</h3></div>
            <div className="detail-list">
              <span><UserRound size={16} /><small>Convener</small><strong>{course.convener}</strong></span>
              <span><CalendarDays size={16} /><small>Delivery</small><strong>{course.delivery}</strong></span>
              <span><BookMarked size={16} /><small>Counts towards</small><strong>{course.countsTowards.join(", ")}</strong></span>
            </div>
          </section>

          <section className="drawer-section">
            <div className="section-title"><h3>Actions</h3></div>
            <label className="drawer-move-field">
              <span>Move course to</span>
              <select
                aria-label="Move course to semester"
                value={attempt.termId}
                disabled={attempt.status === "completed" || attempt.status === "failed"}
                onChange={(event) => {
                  moveAttempt(attempt.id, event.target.value);
                  const term = terms.find((item) => item.id === event.target.value);
                  notify(`${course.code} moved to ${term?.name} ${term && term.year < 2029 ? term.year : ""}`);
                }}
              >
                {terms.map((term) => <option value={term.id} key={term.id}>{term.name} {term.year < 2029 ? term.year : ""}</option>)}
              </select>
              {(attempt.status === "completed" || attempt.status === "failed") && <small>Recorded attempts stay in their original semester.</small>}
            </label>
            <div className="action-grid">
              {attempt.status === "completed" ? (
                <button className="button secondary" type="button" onClick={() => { updateAttempt(attempt.id, "planned"); notify(`${course.code} moved back to planned`); }}>
                  <RotateCcw size={15} /> Undo completion
                </button>
              ) : (
                <button className="button primary" type="button" onClick={() => { updateAttempt(attempt.id, "completed"); notify(`${course.code} marked completed`); }}>
                  <Check size={15} /> Mark completed
                </button>
              )}
              {attempt.status !== "failed" && attempt.status !== "completed" && (
                <button className="button secondary danger" type="button" onClick={() => { updateAttempt(attempt.id, "failed"); notify(`${course.code} recorded as failed`); }}>
                  Record failed attempt
                </button>
              )}
              <button className="button ghost danger" type="button" onClick={remove}>
                <Trash2 size={15} /> Remove from plan
              </button>
            </div>
          </section>
        </div>

        <footer className="drawer-footer">
          <Link className="button secondary full" href={`/courses/${course.code}`}>
            Open full course page <ExternalLink size={15} />
          </Link>
        </footer>
      </aside>
    </div>
  );
}

export function TermChooser({ course, onClose }: { course: Course; onClose: () => void }) {
  const { addCourse, notify } = useCoursemap();
  useEscape(onClose);
  return (
    <div className="overlay-layer small">
      <button className="overlay-dismiss" type="button" aria-label="Close semester chooser" onClick={onClose} />
      <section className="simple-dialog" role="dialog" aria-modal="true" aria-labelledby="term-dialog-title">
        <header>
          <div><span className="eyebrow">{course.code}</span><h2 id="term-dialog-title">Choose a semester</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close semester chooser"><X size={18} /></button>
        </header>
        <div className="term-options">
          {terms.slice(0, 6).map((term) => {
            const available = course.sessions.includes(term.name);
            return (
              <button key={term.id} type="button" onClick={() => { const result = addCourse(course.code, term.id); notify(result.message); if (result.ok) onClose(); }}>
                <span><strong>{term.name} {term.year}</strong><small>{term.dates}</small></span>
                <span className={available ? "badge success" : "badge neutral"}>{available ? "Offered" : "Not listed"}</span>
                <ArrowRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
