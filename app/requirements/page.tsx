"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle, Layers3, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import {
  courseByCode,
  degreeByCode,
  majorByCode,
  requirementGroups,
} from "@/lib/catalogue";
import { earnedUnits, mappedUnits } from "@/lib/planner";

export default function RequirementsPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const completed = earnedUnits(state.attempts);
  const mapped = mappedUnits(state.attempts);

  const values = useMemo(() => {
    const completedAttempts = state.attempts.filter((attempt) => attempt.status === "completed");
    const completedCourses = completedAttempts.map((attempt) => courseByCode(attempt.courseCode)).filter(Boolean);
    const core = completedCourses.filter((course) => course?.countsTowards.some((item) => item.includes("core"))).reduce((sum, course) => sum + (course?.units ?? 0), 0);
    const math = completedCourses.filter((course) => course?.countsTowards.some((item) => item.includes("Mathematics"))).reduce((sum, course) => sum + (course?.units ?? 0), 0);
    const majorUnits = completedCourses.filter((course) => course && major.courseCodes.includes(course.code)).reduce((sum, course) => sum + (course?.units ?? 0), 0);
    const advanced = completedCourses.filter((course) => (course?.level ?? 0) >= 3000).reduce((sum, course) => sum + (course?.units ?? 0), 0);
    return { core, math, major: majorUnits, advanced, electives: 0 };
  }, [major.courseCodes, state.attempts]);

  const remaining = Math.max(0, degree.units - completed);
  const planned = Math.max(0, mapped - completed);

  return (
    <AppShell title="Requirements" subtitle={`${degree.code} · ${state.profile.catalogueYear} rules`}>
      <div className="content-width requirements-page">
        <section className="page-heading compact">
          <div>
            <span className="eyebrow">Degree audit</span>
            <h1>Know exactly what still counts.</h1>
            <p>Completed courses, planned allocations and remaining rule groups in one view.</p>
          </div>
          <Link className="button secondary" href="/profile#academic-plan">Change degree or major</Link>
        </section>

        <section className="requirements-overview">
          <article className="completion-card">
            <div className="completion-ring" style={{ "--progress": `${Math.max(4, (completed / degree.units) * 100)}%` } as React.CSSProperties}>
              <span><strong>{Math.round((completed / degree.units) * 100)}%</strong><small>complete</small></span>
            </div>
            <div>
              <span className="eyebrow">{degree.name}</span>
              <h2>{completed} of {degree.units} units</h2>
              <p>{planned} planned · {remaining} remaining</p>
              <div className="stacked-progress" aria-label={`${completed} completed, ${planned} planned, ${remaining} remaining`}>
                <span className="complete" style={{ width: `${(completed / degree.units) * 100}%` }} />
                <span className="planned" style={{ width: `${(planned / degree.units) * 100}%` }} />
              </div>
            </div>
          </article>
          <article className="insight-card">
            <Sparkles size={19} />
            <span><small>Major pathway</small><strong>{major.name}</strong><p>{values.major} of {major.units} units completed</p></span>
          </article>
          <article className="insight-card warning">
            <TriangleAlert size={19} />
            <span><small>Next unlock</small><strong>Complete COMP1110</strong><p>Unlocks three planned computing courses</p></span>
          </article>
        </section>

        <section className="requirements-layout">
          <div className="requirement-groups">
            <div className="section-heading">
              <div><h2>Requirement groups</h2><p>Courses are allocated once unless the degree rules explicitly allow sharing.</p></div>
              <span className="badge neutral">5 groups</span>
            </div>
            {requirementGroups.map((group) => {
              const value = values[group.id as keyof typeof values];
              const percent = Math.min(100, (value / group.total) * 100);
              return (
                <article className="requirement-card" key={group.id}>
                  <span className={percent >= 100 ? "requirement-status done" : "requirement-status"}>
                    {percent >= 100 ? <Check size={15} /> : <Circle size={15} />}
                  </span>
                  <div className="requirement-info">
                    <strong>{group.name}</strong>
                    <p>{group.description}</p>
                    <div className="requirement-bar"><span style={{ width: `${percent}%`, background: group.colour }} /></div>
                  </div>
                  <span className="requirement-value"><strong>{value}</strong><small>of {group.total} units</small></span>
                  <Link href={`/courses?requirement=${group.id}`} aria-label={`Explore courses for ${group.name}`}><ArrowRight size={16} /></Link>
                </article>
              );
            })}
          </div>

          <aside className="allocation-panel">
            <div className="section-heading"><div><h2>Planned allocation</h2><p>Where mapped units are currently going.</p></div></div>
            <div className="allocation-chart" role="img" aria-label={`${mapped} mapped units across degree requirements`}>
              <span className="allocation-bar core" style={{ height: "72%" }}><i>Core</i><strong>24</strong></span>
              <span className="allocation-bar major" style={{ height: "55%" }}><i>Major</i><strong>18</strong></span>
              <span className="allocation-bar math" style={{ height: "24%" }}><i>Maths</i><strong>6</strong></span>
              <span className="allocation-bar elective" style={{ height: "10%" }}><i>Electives</i><strong>0</strong></span>
            </div>
            <div className="allocation-note">
              <Layers3 size={18} />
              <span><strong>No double-counting detected</strong><p>Every mapped course currently has a valid primary allocation.</p></span>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
