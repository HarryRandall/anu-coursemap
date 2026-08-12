"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDot,
  GripVertical,
  Plus,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { CourseDrawer, CoursePicker } from "@/components/course-overlays";
import { courseByCode, degreeByCode, majorByCode, terms } from "@/lib/catalogue";
import { effectiveStatus, earnedUnits, mappedUnits, statusLabel } from "@/lib/planner";

export default function PlanPage() {
  const { state, moveAttempt, updateProfile, notify } = useCoursemap();
  const [pickerTerm, setPickerTerm] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const completed = earnedUnits(state.attempts);
  const mapped = mappedUnits(state.attempts);

  const issueCount = useMemo(
    () =>
      state.attempts.filter((attempt) => {
        const status = effectiveStatus(attempt, state.attempts);
        return status === "blocked" || status === "approval";
      }).length,
    [state.attempts],
  );

  const dropInto = (termId: string, attemptId: string) => {
    const attempt = state.attempts.find((item) => item.id === attemptId);
    if (!attempt || attempt.status === "completed" || attempt.status === "failed") {
      notify("Recorded attempts stay in their original semester");
      return;
    }
    moveAttempt(attemptId, termId);
    const term = terms.find((item) => item.id === termId);
    notify(`${attempt.courseCode} moved to ${term?.shortName} ${term?.year ?? ""}`);
  };

  return (
    <AppShell title="Degree plan" subtitle={`${degree.code} · ${state.profile.catalogueYear} rules`} fullBleed>
      <div className="plan-page">
        <section className="plan-hero">
          <div>
            <span className="eyebrow">{degree.name}</span>
            <h1>Your degree, mapped.</h1>
            <p>Move courses between semesters and see eligibility change as your plan evolves.</p>
          </div>
          <div className="plan-hero-actions">
            <label className="year-control large">
              <span>Rules year</span>
              <select
                value={state.profile.catalogueYear}
                onChange={(event) => updateProfile({ catalogueYear: Number(event.target.value) })}
                aria-label="Rules year"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </label>
            <Link className="button secondary" href="/profile#academic-plan">Change degree or major</Link>
            <button className="button primary" type="button" onClick={() => setPickerTerm("2027-s1")}>
              <Plus size={16} /> Add course
            </button>
          </div>
        </section>

        <section className="board-panel" aria-labelledby="roadmap-title">
          <header className="board-toolbar">
            <div>
              <h2 id="roadmap-title">Roadmap board</h2>
              <span>{mapped} units mapped · {major.name}</span>
            </div>
            <div className="board-legend" aria-label="Course statuses">
              <span><i className="legend completed" /> Completed</span>
              <span><i className="legend planned" /> Planned</span>
              <span><i className="legend attention" /> Needs attention</span>
            </div>
          </header>

          <div className="board-scroll" data-testid="roadmap-board">
            {terms.map((term, index) => {
              const termAttempts = state.attempts.filter((attempt) => attempt.termId === term.id);
              const termUnits = termAttempts.reduce(
                (total, attempt) => total + (attempt.status === "failed" ? 0 : courseByCode(attempt.courseCode)?.units ?? 0),
                0,
              );
              const overload = termUnits > 24;
              const isFirstOfYear = index === 0 || terms[index - 1]?.year !== term.year;
              return (
                <section
                  className={dragging ? "term-column drop-ready" : "term-column"}
                  key={term.id}
                  data-testid={`term-${term.id}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const attemptId = event.dataTransfer.getData("text/coursemap-attempt") || dragging;
                    if (attemptId) dropInto(term.id, attemptId);
                    setDragging(null);
                  }}
                >
                  <header className="term-header">
                    <span>
                      {isFirstOfYear && term.id !== "unscheduled" && <small className="year-label">Year {term.year - state.profile.commencementYear + 1} · {term.year}</small>}
                      {term.id === "unscheduled" && <small className="year-label">Parking space</small>}
                      <strong>{term.name}</strong>
                      <small>{term.dates}</small>
                    </span>
                    <span className={overload ? "unit-count warning" : "unit-count"}>{termUnits} units</span>
                  </header>

                  {overload && (
                    <div className="overload-notice">
                      <AlertTriangle size={15} />
                      <span><strong>Overload approval needed</strong><small>Standard load is 24 units</small></span>
                    </div>
                  )}

                  <div className="term-cards">
                    {termAttempts.map((attempt) => {
                      const course = courseByCode(attempt.courseCode);
                      if (!course) return null;
                      const status = effectiveStatus(attempt, state.attempts);
                      const draggable = attempt.status === "planned" || attempt.status === "enrolled";
                      return (
                        <button
                          className={`board-card ${course.accent} ${status}`}
                          key={attempt.id}
                          type="button"
                          draggable={draggable}
                          onDragStart={(event) => {
                            setDragging(attempt.id);
                            event.dataTransfer.setData("text/coursemap-attempt", attempt.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => setDragging(null)}
                          onClick={() => setSelectedAttempt(attempt.id)}
                        >
                          <div className="board-card-top">
                            <span className="drag-handle" aria-hidden="true"><GripVertical size={14} /></span>
                            <strong>{course.code}</strong>
                            <span className={`status-dot ${status}`} title={statusLabel(status)}>
                              {status === "completed" ? <Check size={11} /> : status === "blocked" || status === "approval" ? <AlertTriangle size={11} /> : <CircleDot size={11} />}
                            </span>
                          </div>
                          <span className="board-card-title">{course.name}</span>
                          <div className="board-card-bottom">
                            <span>{course.units} units</span>
                            <span className={`status-text ${status}`}>{statusLabel(status)}</span>
                          </div>
                          {status === "blocked" && <span className="board-card-note">Requires {course.prerequisiteCodes.join(" + ")}</span>}
                          {status === "approval" && <span className="board-card-note">Convener permission required</span>}
                          {status === "failed" && <span className="board-card-note">Attempt retained · no units earned</span>}
                        </button>
                      );
                    })}

                    <button className="add-board-card" type="button" onClick={() => setPickerTerm(term.id)}>
                      <Plus size={16} /> Add a course
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
          <div className="board-hint"><ArrowRight size={14} /> Scroll across semesters. Drag planned courses to reschedule them.</div>
        </section>

        <section className="plan-summary" aria-label="Degree progress summary">
          <div className="summary-main">
            <span className="progress-ring" style={{ "--progress": `${Math.max(5, (completed / degree.units) * 100)}%` } as React.CSSProperties}>
              <strong>{Math.round((completed / degree.units) * 100)}%</strong>
            </span>
            <span>
              <small>Degree progress</small>
              <strong>{completed} of {degree.units} units completed</strong>
              <p>{mapped} units mapped across your plan</p>
            </span>
          </div>
          <div className="summary-stat"><Sparkles size={17} /><span><small>Selected major</small><strong>{major.name}</strong></span></div>
          <div className="summary-stat"><AlertTriangle size={17} /><span><small>Plan checks</small><strong>{issueCount} {issueCount === 1 ? "item" : "items"} to review</strong></span></div>
          <Link className="button secondary" href="/requirements">View requirements <ArrowRight size={15} /></Link>
        </section>
      </div>

      {pickerTerm && <CoursePicker termId={pickerTerm} onClose={() => setPickerTerm(null)} />}
      {selectedAttempt && <CourseDrawer attemptId={selectedAttempt} onClose={() => setSelectedAttempt(null)} />}
    </AppShell>
  );
}
