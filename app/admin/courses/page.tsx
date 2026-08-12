"use client";

import Link from "next/link";
import { Download, ExternalLink, FilterX, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { courses } from "@/lib/catalogue";

export default function AdminCoursesPage() {
  const { notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All levels");
  const [stateFilter, setStateFilter] = useState("All states");
  const [selected, setSelected] = useState<string[]>([]);
  const filtered = useMemo(() => courses.filter((course) => `${course.code} ${course.name} ${course.convener}`.toLowerCase().includes(query.toLowerCase()) && (level === "All levels" || String(course.level / 1000) === level) && (stateFilter === "All states" || course.parseState === stateFilter)), [query, level, stateFilter]);

  const exportCsv = () => {
    const header = "code,name,year,units,level,sessions,convener,parse_state\n";
    const rows = filtered.map((course) => [course.code, `"${course.name}"`, course.year, course.units, course.level, `"${course.sessions.join("; ")}"`, `"${course.convener}"`, course.parseState].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "coursemap-courses-2026.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify(`${filtered.length} course rows exported`);
  };

  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map((course) => course.code));

  return (
    <AppShell title="Course data" subtitle="Versioned course grid" admin>
      <div className="admin-page wide-admin-page">
        <section className="page-heading compact admin-grid-heading">
          <div><span className="eyebrow">2026 course versions</span><h1>Courses grid</h1><p>Parsed fields, source metadata and review state.</p></div>
          <div className="heading-button-row"><button className="button secondary" type="button" onClick={exportCsv}><Download size={15} /> Export CSV</button><button className="button primary" type="button" disabled={selected.length === 0} onClick={() => { notify(`${selected.length} course${selected.length === 1 ? "" : "s"} queued for reparse`); setSelected([]); }}><RefreshCw size={15} /> Reparse {selected.length > 0 ? selected.length : "selected"}</button></div>
        </section>

        <section className="admin-grid-panel">
          <div className="admin-grid-toolbar">
            <label className="grid-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, name or convener" /><span>{filtered.length} rows</span></label>
            <label><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option>All levels</option><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option></select></label>
            <label><span>Parse state</span><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option>All states</option><option>Verified</option><option>Automatic</option><option>Review</option></select></label>
            <button className="button ghost" type="button" onClick={() => { setQuery(""); setLevel("All levels"); setStateFilter("All states"); }}><FilterX size={15} /> Clear</button>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table courses-admin-table">
              <thead><tr><th><input type="checkbox" aria-label="Select all visible courses" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th><th>Course</th><th>Year</th><th>Units</th><th>Level</th><th>Sessions</th><th>Convener</th><th>Prereqs</th><th>Used by</th><th>Parse state</th><th>Last changed</th><th /></tr></thead>
              <tbody>{filtered.map((course) => <tr key={course.code}><td><input type="checkbox" aria-label={`Select ${course.code}`} checked={selected.includes(course.code)} onChange={() => setSelected((current) => current.includes(course.code) ? current.filter((code) => code !== course.code) : [...current, course.code])} /></td><td><Link href={`/courses/${course.code}`}><strong>{course.code}</strong><small>{course.name}</small></Link></td><td>{course.year}</td><td>{course.units}</td><td>{course.level}</td><td>{course.sessions.map((item) => item.replace("Semester ", "S")).join(" · ")}</td><td><strong>{course.convener}</strong><small>{course.school}</small></td><td>{course.prerequisiteCodes.length}</td><td>{course.countsTowards.length}</td><td><span className={`badge ${course.parseState.toLowerCase()}`}>{course.parseState}</span></td><td>{course.lastChanged}</td><td><a className="icon-button" href={course.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ANU source for ${course.code}`}><ExternalLink size={14} /></a></td></tr>)}</tbody>
            </table>
          </div>
          <footer className="grid-footer"><span>Showing {filtered.length} sample rows from 3,012 course versions</span><span>Prototype data · database connection TBD</span></footer>
        </section>
      </div>
    </AppShell>
  );
}
