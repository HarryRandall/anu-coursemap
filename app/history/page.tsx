"use client";

import { ArrowRight, Check, Clock3, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { CourseDrawer } from "@/components/course-overlays";
import { courseByCode, terms } from "@/lib/catalogue";

export default function HistoryPage() {
  const { state } = useCoursemap();
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const attempts = [...state.attempts].sort((a, b) => {
    const aIndex = terms.findIndex((term) => term.id === a.termId);
    const bIndex = terms.findIndex((term) => term.id === b.termId);
    return aIndex - bIndex;
  });

  return (
    <AppShell title="Course history" subtitle="Every attempt stays visible">
      <div className="content-width history-page">
        <section className="page-heading compact">
          <div><span className="eyebrow">Academic record</span><h1>Attempts, results and repeats.</h1><p>Failed courses award no units and stay separate from any future attempt.</p></div>
        </section>

        <div className="history-summary">
          <span><Check size={17} /><strong>{attempts.filter((item) => item.status === "completed").length}</strong><small>completed</small></span>
          <span><Clock3 size={17} /><strong>{attempts.filter((item) => item.status === "planned").length}</strong><small>planned</small></span>
          <span><X size={17} /><strong>{attempts.filter((item) => item.status === "failed").length}</strong><small>failed attempts</small></span>
          <span><RotateCcw size={17} /><strong>{new Set(attempts.map((item) => item.courseCode)).size}</strong><small>unique courses</small></span>
        </div>

        <section className="data-card">
          <header><div><h2>All attempts</h2><p>Chronological view of your current demo plan.</p></div><span className="badge neutral">{attempts.length} records</span></header>
          <div className="responsive-table history-table" role="table" aria-label="Course attempt history">
            <div className="table-head" role="row"><span>Course</span><span>Study period</span><span>Status</span><span>Mark</span><span>Units earned</span><span /></div>
            {attempts.map((attempt) => {
              const course = courseByCode(attempt.courseCode);
              const term = terms.find((item) => item.id === attempt.termId);
              if (!course || !term) return null;
              return (
                <button className="table-row" type="button" role="row" key={attempt.id} onClick={() => setSelectedAttempt(attempt.id)}>
                  <span><strong>{course.code}</strong><small>{course.name}</small></span>
                  <span>{term.name} {term.year < 2029 ? term.year : ""}</span>
                  <span><i className={`badge ${attempt.status}`}>{attempt.status}</i></span>
                  <span>{attempt.mark ?? "-"}</span>
                  <span>{attempt.status === "completed" ? `${course.units} units` : "0 units"}</span>
                  <span><ArrowRight size={16} /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      {selectedAttempt && <CourseDrawer attemptId={selectedAttempt} onClose={() => setSelectedAttempt(null)} />}
    </AppShell>
  );
}
