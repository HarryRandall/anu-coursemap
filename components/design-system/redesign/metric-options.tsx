"use client";

import { useState } from "react";
import {
  ComponentReviewProvider,
  useComponentReview,
} from "../review/review-context";
import {
  previewPlan,
  previewTerms,
  previewCourses,
  previewRequirements,
} from "./fixtures";
import styles from "./metric-options.module.css";

const allocated = previewPlan.total - previewPlan.unallocated;
const ready = previewCourses.filter((course) => course.tone === "green").length;
const future = previewTerms.slice(4);
const options = [
  {
    id: "load",
    title: "Current semester",
    value: "24",
    unit: "/ 24 units",
    note: "4 courses · standard load",
    kind: "segments",
    values: [6, 6, 6, 6],
    labels: ["Course 1", "Course 2", "Course 3", "Course 4"],
  },
  {
    id: "coverage",
    title: "Planning coverage",
    value: "84%",
    unit: "allocated",
    note: allocated + " of 192 units have a place",
    kind: "ring",
    values: [allocated, previewPlan.total],
    labels: [],
  },
  {
    id: "readiness",
    title: "Next semester readiness",
    value: String(ready),
    unit: "/ 4 ready",
    note: "2 courses need a prerequisite check",
    kind: "status",
    values: [1, 1, 0, 0],
    labels: previewCourses.map((c) => c.code),
  },
  {
    id: "remaining",
    title: "Room in your plan",
    value: "30",
    unit: "units free",
    note: "Equivalent to 5 standard 6-unit courses",
    kind: "slots",
    values: [6, 6, 6, 6, 6],
    labels: [],
  },
  {
    id: "semester-bars",
    title: "Upcoming semester load",
    value: "24",
    unit: "units next semester",
    note: "Units per semester · last semester 18",
    kind: "bars",
    values: future.map((t) => t.remaining),
    labels: future.map((t) => t.name),
  },
  {
    id: "completion-ring",
    title: "Degree completed",
    value: "25%",
    unit: "complete",
    note: "48 of 192 units completed",
    kind: "ring",
    values: [48, 192],
    labels: [],
  },
  {
    id: "unit-mix",
    title: "Your unit mix",
    value: "192",
    unit: "degree units",
    note: "48 completed · 24 enrolled · 90 planned · 30 free",
    kind: "stack",
    values: [48, 24, 90, 30],
    labels: ["Completed", "Enrolled", "Planned", "Free"],
  },
  {
    id: "progress-line",
    title: "Planned progress",
    value: "162",
    unit: "units by end of 2028",
    note: "Cumulative units · includes future plans",
    kind: "line",
    values: previewTerms.map((_, i) =>
      previewTerms
        .slice(0, i + 1)
        .reduce((n, t) => n + t.completed + t.remaining, 0),
    ),
    labels: [],
  },
  {
    id: "requirements",
    title: "Requirements progress",
    value: "3",
    unit: "degree groups",
    note: "Completed units in each applicable group",
    kind: "rows",
    values: previewRequirements.map((r) =>
      Math.round((r.completed / r.total) * 100),
    ),
    labels: ["Computing", "Mathematics", "Electives"],
  },
  {
    id: "next-term",
    title: "Next semester courses",
    value: "4",
    unit: "courses · 24 units",
    note: "Semester 1, 2027",
    kind: "chips",
    values: [6, 6, 6, 6],
    labels: previewCourses.map((c) => c.code),
  },
  {
    id: "load-balance",
    title: "Load balance",
    value: "3",
    unit: "/ 4 semesters at 24 units",
    note: "Upcoming semesters · 6 units below standard in the last",
    kind: "dots",
    values: [24, 24, 24, 18],
    labels: future.map((t) => t.name),
  },
  {
    id: "finish",
    title: "Planned finish",
    value: "Nov 2028",
    unit: "",
    note: "4 upcoming semesters · 30 units still to allocate",
    kind: "timeline",
    values: [24, 24, 24, 18],
    labels: ["S1 2027", "S2 2027", "S1 2028", "S2 2028"],
  },
] as const;

type Option = (typeof options)[number];
function Graph({ option: o }: { option: Option }) {
  const description = o.labels.length
    ? o.labels.map((label, i) => label + ": " + o.values[i]).join(", ")
    : o.note;
  if (o.kind === "ring") {
    const percent = (o.values[0] / o.values[1]) * 100;
    return (
      <svg
        className={styles.ring}
        viewBox="0 0 64 64"
        role="img"
        aria-label={o.note}
      >
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="var(--rd-line)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="var(--rd-brand-text)"
          strokeWidth="6"
          pathLength="100"
          strokeDasharray={percent + " 100"}
          transform="rotate(-90 32 32)"
        />
      </svg>
    );
  }
  if (o.kind === "line")
    return (
      <svg
        className={styles.sparkline}
        viewBox="0 0 280 46"
        preserveAspectRatio="none"
        role="img"
        aria-label={o.note}
      >
        <polyline
          points={o.values
            .map((v, i) => i * 40 + "," + (44 - (v / 192) * 42))
            .join(" ")}
          fill="none"
          stroke="var(--rd-brand-text)"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  return (
    <div
      className={styles.visual}
      data-kind={o.kind}
      role="img"
      aria-label={description}
    >
      {o.values.map((value, i) => (
        <div key={i} style={o.kind === "stack" ? { flex: value } : undefined}>
          {o.kind === "rows" && <small>{o.labels[i]}</small>}
          <span
            data-index={i}
            data-ready={value === 1}
            style={
              o.kind === "bars"
                ? { height: (value / 30) * 40 }
                : o.kind === "rows"
                  ? { width: value + "%" }
                  : undefined
            }
          >
            {o.kind === "status"
              ? value
                ? "✓"
                : "!"
              : o.kind === "chips"
                ? o.labels[i]
                : o.kind === "slots"
                  ? "+6"
                  : o.kind === "dots"
                    ? value
                    : null}
          </span>
          {(o.kind === "bars" || o.kind === "timeline") && (
            <small>{o.labels[i]}</small>
          )}
        </div>
      ))}
    </div>
  );
}
function Choices() {
  const { decisions, setDecision, saveStatus, error } = useComponentReview();
  const [onlySelected, setOnlySelected] = useState(false);
  const selected = options.filter(
    (o) =>
      decisions["coursemap:redesign:metric:" + o.id]?.decision === "preferred",
  );
  const visible = onlySelected ? selected : options;
  return (
    <section className={styles.chooser} aria-label="Metric card choices">
      <header className={styles.toolbar}>
        <div>
          <h2>Metric cards</h2>
          <p>12 options · pick the cards you want on your dashboard</p>
        </div>
        <button
          type="button"
          aria-pressed={onlySelected}
          onClick={() => setOnlySelected(!onlySelected)}
        >
          {onlySelected
            ? "Show all 12"
            : "Show selected (" + selected.length + ")"}
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      <span role="status" className={styles.status}>
        {saveStatus === "saving"
          ? "Saving choices…"
          : saveStatus === "loading"
            ? "Loading choices…"
            : selected.length + " selected"}
      </span>
      <div className={styles.grid}>
        {visible.map((o) => {
          const id = "coursemap:redesign:metric:" + o.id;
          const chosen = decisions[id]?.decision === "preferred";
          return (
            <article key={o.id} className={styles.card} data-selected={chosen}>
              <header>
                <h3>{o.title}</h3>
                <span>{String(options.indexOf(o) + 1).padStart(2, "0")}</span>
              </header>
              <div className={styles.content} data-kind={o.kind}>
                <div className={styles.value}>
                  {o.value}
                  <small>{o.unit}</small>
                </div>
                <Graph option={o} />
              </div>
              <p>{o.note}</p>
              <button
                type="button"
                aria-label={(chosen ? "Remove " : "Choose ") + o.title}
                aria-pressed={chosen}
                disabled={saveStatus === "loading" || saveStatus === "saving"}
                onClick={() =>
                  setDecision(
                    {
                      id,
                      family: "redesign",
                      source: "coursemap",
                      title: "Metric: " + o.title,
                      description: o.id,
                    },
                    chosen ? null : "preferred",
                  )
                }
              >
                {chosen ? "Selected ✓" : "Choose card +"}
              </button>
            </article>
          );
        })}
      </div>
      {onlySelected && !selected.length && (
        <p>No cards selected yet. Show all 12 to choose your favourites.</p>
      )}
    </section>
  );
}
export function MetricOptions() {
  return (
    <ComponentReviewProvider items={[]}>
      <Choices />
    </ComponentReviewProvider>
  );
}
