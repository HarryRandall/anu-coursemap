"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import {
  courseByCode,
  degreeByCode,
  majorByCode,
  requirementGroups,
  type Course,
} from "@/lib/catalogue";
import { earnedUnits, mappedUnits } from "@/lib/planner";

type RequirementValues = Record<string, number>;

function countRequirementUnits(courses: Course[], majorCodes: string[]): RequirementValues {
  return {
    core: courses
      .filter((course) => course.countsTowards.includes("Computing core"))
      .reduce((sum, course) => sum + course.units, 0),
    math: courses
      .filter((course) => course.countsTowards.some((item) => item.includes("Mathematics")))
      .reduce((sum, course) => sum + course.units, 0),
    major: courses
      .filter((course) => majorCodes.includes(course.code))
      .reduce((sum, course) => sum + course.units, 0),
    advanced: courses
      .filter((course) => course.level >= 3000)
      .reduce((sum, course) => sum + course.units, 0),
    electives: 0,
  };
}

export default function RequirementsPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const completed = earnedUnits(state.attempts);
  const mapped = mappedUnits(state.attempts);
  const planned = Math.max(0, mapped - completed);
  const stillToPlan = Math.max(0, degree.units - mapped);
  const completePercent = Math.round((completed / degree.units) * 100);

  const progressByGroup = useMemo(() => {
    const completedCodes = new Set(
      state.attempts.filter((attempt) => attempt.status === "completed").map((attempt) => attempt.courseCode),
    );
    const completedCourses = [...completedCodes]
      .map(courseByCode)
      .filter((course): course is Course => Boolean(course));

    const plannedCodes = new Set(
      state.attempts
        .filter((attempt) => attempt.status !== "failed" && !completedCodes.has(attempt.courseCode))
        .map((attempt) => attempt.courseCode),
    );
    const plannedCourses = [...plannedCodes]
      .map(courseByCode)
      .filter((course): course is Course => Boolean(course));

    const completedValues = countRequirementUnits(completedCourses, major.courseCodes);
    const plannedValues = countRequirementUnits(plannedCourses, major.courseCodes);

    return Object.fromEntries(
      requirementGroups.map((group) => {
        const completedUnits = Math.min(group.total, completedValues[group.id] ?? 0);
        const plannedUnits = Math.min(group.total - completedUnits, plannedValues[group.id] ?? 0);
        return [group.id, {
          completed: completedUnits,
          planned: plannedUnits,
          stillNeeded: Math.max(0, group.total - completedUnits - plannedUnits),
        }];
      }),
    );
  }, [major.courseCodes, state.attempts]);

  return (
    <AppShell title="Requirements" subtitle={`${degree.code} · ${state.profile.catalogueYear} rules`}>
      <div className="content-width requirements-page">
        <section className="page-heading compact requirements-heading">
          <div>
            <h1>{degree.name} requirements</h1>
            <p>{major.name} major · {state.profile.catalogueYear} rules</p>
          </div>
          <Link className="button secondary" href="/profile#academic-plan">Edit study details</Link>
        </section>

        <section className="requirements-overview" aria-label="Degree progress">
          <article className="degree-progress-card">
            <header>
              <div>
                <h2>Degree progress</h2>
                <p>{degree.units}-unit programme</p>
              </div>
              <strong>{completePercent}% complete</strong>
            </header>
            <div
              className="stacked-progress"
              aria-label={`${completed} completed, ${planned} planned, ${stillToPlan} still to plan`}
            >
              <span className="complete" style={{ width: `${(completed / degree.units) * 100}%` }} />
              <span className="planned" style={{ width: `${(planned / degree.units) * 100}%` }} />
            </div>
            <div className="progress-metrics">
              <span><i className="metric-key complete" /><strong>{completed} units</strong><small>Completed</small></span>
              <span><i className="metric-key planned" /><strong>{planned} units</strong><small>In your plan</small></span>
              <span><i className="metric-key remaining" /><strong>{stillToPlan} units</strong><small>Still to plan</small></span>
            </div>
          </article>
        </section>

        <section className="requirements-layout">
          <div className="requirement-groups">
            <div className="section-heading">
              <div>
                <h2>Degree requirements</h2>
                <p>See how completed and planned courses match each rule group.</p>
              </div>
            </div>
            {requirementGroups.map((group) => {
              const progress = progressByGroup[group.id] ?? { completed: 0, planned: 0, stillNeeded: group.total };
              const completedPercent = Math.min(100, (progress.completed / group.total) * 100);
              const plannedPercent = Math.min(100 - completedPercent, (progress.planned / group.total) * 100);
              return (
                <article className="requirement-card" key={group.id}>
                  <span className={progress.stillNeeded === 0 ? "requirement-status done" : "requirement-status"}>
                    {progress.stillNeeded === 0 ? <Check size={15} /> : <Circle size={15} />}
                  </span>
                  <div className="requirement-info">
                    <strong>{group.name}</strong>
                    <p>{group.description}</p>
                    <div className="requirement-bar" aria-label={`${progress.completed} completed, ${progress.planned} planned, ${progress.stillNeeded} still needed`}>
                      <span className="complete" style={{ width: `${completedPercent}%`, background: group.colour }} />
                      <span className="planned" style={{ width: `${plannedPercent}%`, background: group.colour }} />
                    </div>
                    <small className="requirement-breakdown">
                      {progress.completed} completed · {progress.planned} planned · {progress.stillNeeded} still needed
                    </small>
                  </div>
                  <span className="requirement-value"><strong>{progress.completed + progress.planned}</strong><small>of {group.total} units mapped</small></span>
                  <Link href={`/courses?requirement=${group.id}`} aria-label={`Explore courses for ${group.name}`}><ArrowRight size={16} /></Link>
                </article>
              );
            })}
            <footer className="requirements-note">
              Courses may match more than one group. Final allocation follows the programme rules.
            </footer>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
