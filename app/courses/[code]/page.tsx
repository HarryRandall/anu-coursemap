"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  GitBranch,
  Plus,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { TermChooser } from "@/components/course-overlays";
import { Course, courseByCode } from "@/lib/catalogue";

export default function CoursePage() {
  const params = useParams<{ code: string }>();
  const { state } = useCoursemap();
  const [year, setYear] = useState(state.profile.catalogueYear);
  const [planCourse, setPlanCourse] = useState<Course | null>(null);
  const course = courseByCode(String(params.code).toUpperCase());

  if (!course) {
    return (
      <AppShell title="Course not found">
        <div className="content-width"><div className="empty-state page-empty"><BookOpen size={28} /><strong>We could not find that course</strong><Link className="button secondary" href="/courses">Back to courses</Link></div></div>
      </AppShell>
    );
  }

  return (
    <AppShell title={course.code} subtitle={`${year} course version`}>
      <div className="content-width course-page">
        <Link className="back-link" href="/courses"><ArrowLeft size={15} /> Back to courses</Link>
        <section className="course-page-hero">
          <div>
            <span className={`course-token xlarge ${course.accent}`}>{course.code.slice(0, 2)}</span>
            <span className="eyebrow">{course.code} · {course.subject}</span>
            <h1>{course.name}</h1>
            <p>{course.description}</p>
          </div>
          <div className="course-page-actions">
            <label className="year-control large"><span>Course year</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select></label>
            <button className="button primary" type="button" onClick={() => setPlanCourse(course)}><Plus size={16} /> Add to plan</button>
          </div>
        </section>

        <div className="course-page-grid">
          <div className="course-page-main">
            <section className="detail-card">
              <header><div><h2>Requisites and compatibility</h2><p>Structured rules for the {year} course version.</p></div><span className="badge success"><Check size={12} /> Parsed</span></header>
              <div className="rule-tree">
                <div className="rule-tree-label"><GitBranch size={16} /><span><strong>Must satisfy all</strong><small>Academic eligibility</small></span></div>
                <div className="rule-tree-branch">
                  <span className={course.prerequisiteCodes.length ? "rule-node prerequisite" : "rule-node open"}><strong>Prerequisite</strong><p>{course.prerequisiteText}</p>{course.prerequisiteCodes.length > 0 && <i>{course.prerequisiteCodes.join(" + ")}</i>}</span>
                  {course.corequisiteText && <span className="rule-node corequisite"><strong>Corequisite</strong><p>{course.corequisiteText}</p></span>}
                  {course.permissionText && <span className="rule-node permission"><strong>Permission</strong><p>{course.permissionText}</p></span>}
                </div>
              </div>
              {course.incompatibilities.length > 0 && <div className="incompatibility-row"><X size={17} /><span><strong>Incompatible with</strong><p>{course.incompatibilities.join(", ")}</p></span></div>}
            </section>

            <section className="detail-card">
              <header><div><h2>What this course counts towards</h2><p>Potential allocations in your current Bachelor of Computing plan.</p></div></header>
              <div className="counts-grid">{course.countsTowards.map((item, index) => <span key={item}><i className={index === 0 ? "primary" : "secondary"} /><span><strong>{item}</strong><small>{index === 0 ? "Primary allocation" : "Eligible option"}</small></span><ArrowRight size={15} /></span>)}</div>
            </section>

            <section className="detail-card">
              <header><div><h2>Historical versions</h2><p>Course data belongs to a specific academic year.</p></div></header>
              <div className="version-list">{[2026, 2025, 2024].map((item) => <button className={year === item ? "active" : ""} type="button" key={item} onClick={() => setYear(item)}><span><strong>{item}</strong><small>{item === 2026 ? `Current version · changed ${course.lastChanged}` : "Archived version · no structural change"}</small></span><span className={item === 2026 ? "badge success" : "badge neutral"}>{item === 2026 ? "Current" : "Historical"}</span><ArrowRight size={15} /></button>)}</div>
            </section>
          </div>

          <aside className="course-facts-card">
            <h2>Course details</h2>
            <dl>
              <div><dt><CalendarDays size={15} /> Offered</dt><dd>{course.sessions.join(", ")}</dd></div>
              <div><dt><UserRound size={15} /> Convener</dt><dd>{course.convener}</dd></div>
              <div><dt><BookOpen size={15} /> School</dt><dd>{course.school}</dd></div>
              <div><dt><ShieldAlert size={15} /> Parse state</dt><dd>{course.parseState}</dd></div>
            </dl>
            <div className="fact-pills"><span><small>Units</small><strong>{course.units}</strong></span><span><small>Level</small><strong>{course.level}</strong></span><span><small>Delivery</small><strong>{course.delivery}</strong></span></div>
            <a className="button secondary full" href={course.sourceUrl} target="_blank" rel="noreferrer">Open ANU source <ExternalLink size={15} /></a>
            <p className="source-note">This prototype retains the source URL, academic year and parse state for every version.</p>
          </aside>
        </div>
      </div>
      {planCourse && <TermChooser course={planCourse} onClose={() => setPlanCourse(null)} />}
    </AppShell>
  );
}
