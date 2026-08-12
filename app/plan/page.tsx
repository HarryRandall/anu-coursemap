"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  GripVertical,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { CourseDrawer, CoursePicker } from "@/components/course-overlays";
import { courseByCode, degreeByCode, majorByCode, terms, type Term } from "@/lib/catalogue";
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

  const scheduledYears = useMemo(
    () =>
      [...new Set(terms.filter((term) => term.id !== "unscheduled").map((term) => term.year))].map((year) => ({
        year,
        terms: terms.filter((term) => term.year === year && term.id !== "unscheduled"),
      })),
    [],
  );
  const unscheduled = terms.find((term) => term.id === "unscheduled");

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

  const renderTerm = (term: Term) => {
    const termAttempts = state.attempts.filter((attempt) => attempt.termId === term.id);
    const termUnits = termAttempts.reduce(
      (total, attempt) => total + (attempt.status === "failed" ? 0 : courseByCode(attempt.courseCode)?.units ?? 0),
      0,
    );
    const overload = termUnits > 24;

    return (
      <section
        className={dragging ? "term-lane drop-ready" : "term-lane"}
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
            <strong>{term.name}</strong>
            <small>{term.dates}</small>
          </span>
          <span className="term-header-actions">
            <span className={overload ? "unit-count warning" : "unit-count"}>{termUnits} units</span>
            <button type="button" onClick={() => setPickerTerm(term.id)} aria-label={`Add a course to ${term.name} ${term.year}`}>
              <Plus size={14} />
            </button>
          </span>
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
                  {draggable && <span className="drag-handle" aria-hidden="true"><GripVertical size={14} /></span>}
                  <strong>{course.code}</strong>
                  <span className={`status-pill ${status}`}>
                    {status === "completed" && <Check size={11} />}
                    {statusLabel(status)}
                  </span>
                </div>
                <span className="board-card-title">{course.name}</span>
                <span className="board-card-meta">{course.units} units · {course.countsTowards[0]}</span>
                {status === "blocked" && <span className="board-card-note">Needs {course.prerequisiteCodes.join(" + ")}</span>}
                {status === "approval" && <span className="board-card-note">Convener permission required</span>}
                {status === "failed" && <span className="board-card-note">Failed attempt · 0 units</span>}
              </button>
            );
          })}

          {termAttempts.length === 0 && (
            <button className="add-board-card empty" type="button" onClick={() => setPickerTerm(term.id)}>
              <Plus size={16} /> Add first course
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <AppShell title="Degree plan" subtitle={`${degree.code} · ${state.profile.catalogueYear} rules`} fullBleed>
      <div className="plan-page">
        <section className="plan-header">
          <div>
            <h1>{degree.name} plan</h1>
            <p>{major.name} major · {state.profile.catalogueYear} rules</p>
          </div>
          <div className="plan-header-actions">
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
            <Link className="button secondary" href="/profile#academic-plan">Edit degree</Link>
            <button className="button primary" type="button" onClick={() => setPickerTerm("2027-s1")}>
              <Plus size={16} /> Add course
            </button>
          </div>
        </section>

        <section className="board-panel" aria-label="Course plan">
          <header className="board-toolbar">
            <span>{mapped} of {degree.units} units mapped</span>
            <div className="board-legend" aria-label="Course statuses">
              <span><i className="legend completed" /> Completed</span>
              <span><i className="legend planned" /> Planned</span>
              <span><i className="legend attention" /> Needs attention</span>
            </div>
          </header>

          <div className="year-board" data-testid="roadmap-board">
            {scheduledYears.map((yearGroup, index) => {
              const yearAttempts = state.attempts.filter((attempt) => yearGroup.terms.some((term) => term.id === attempt.termId));
              const yearUnits = yearAttempts.reduce(
                (total, attempt) => total + (attempt.status === "failed" ? 0 : courseByCode(attempt.courseCode)?.units ?? 0),
                0,
              );
              return (
                <section className="year-row" key={yearGroup.year}>
                  <header className="year-rail">
                    <small>Year {index + 1}</small>
                    <strong>{yearGroup.year}</strong>
                    <span>{yearUnits} units</span>
                  </header>
                  {yearGroup.terms.map(renderTerm)}
                </section>
              );
            })}

            {unscheduled && (
              <section className="unscheduled-row">
                <header className="year-rail">
                  <small>Later</small>
                  <strong>Unscheduled</strong>
                </header>
                <div className="unscheduled-tray">{renderTerm(unscheduled)}</div>
              </section>
            )}
          </div>
        </section>

        <section className="plan-summary" aria-label="Plan summary">
          <span><small>Completed</small><strong>{completed} of {degree.units} units</strong></span>
          <span><small>Mapped</small><strong>{mapped} units</strong></span>
          <span><small>Needs review</small><strong>{issueCount} {issueCount === 1 ? "item" : "items"}</strong></span>
          <Link href="/requirements"><span><small>Degree rules</small><strong>View requirements</strong></span><ArrowRight size={15} /></Link>
        </section>
      </div>

      {pickerTerm && <CoursePicker termId={pickerTerm} onClose={() => setPickerTerm(null)} />}
      {selectedAttempt && <CourseDrawer attemptId={selectedAttempt} onClose={() => setSelectedAttempt(null)} />}
    </AppShell>
  );
}
