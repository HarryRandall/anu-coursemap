"use client";

import { ArrowRight, BookOpen, GraduationCap, Search, Shapes } from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { degrees, majors } from "@/lib/catalogue";

type StructureRow = {
  code: string;
  name: string;
  type: string;
  units: number;
  programmes: number;
  options: number;
  state: string;
  changed: string;
};

const structures: StructureRow[] = [
  ...degrees.map((degree, index) => ({ code: degree.code, name: degree.name, type: "Degree", units: degree.units, programmes: 1, options: 5 + index, state: "Verified", changed: "8 Aug 2026" })),
  ...majors.map((major, index) => ({ code: major.code, name: major.name, type: "Major", units: major.units, programmes: index === 0 ? 4 : 3, options: major.courseCodes.length, state: index === 4 ? "Review" : "Automatic", changed: index === 2 ? "2 Aug 2026" : "12 Jul 2026" })),
  { code: "CYBR-MIN", name: "Cyber Security", type: "Minor", units: 24, programmes: 6, options: 8, state: "Automatic", changed: "12 Jul 2026" },
  { code: "HCI-SPEC", name: "Human-Centred Computing", type: "Specialisation", units: 24, programmes: 2, options: 7, state: "Review", changed: "5 Aug 2026" },
];

export default function AdminProgrammesPage() {
  const { notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All structures");
  const [selected, setSelected] = useState<StructureRow | null>(null);
  const filtered = useMemo(() => structures.filter((row) => `${row.code} ${row.name}`.toLowerCase().includes(query.toLowerCase()) && (type === "All structures" || row.type === type)), [query, type]);

  return (
    <AppShell title="Programmes" subtitle="Degrees and academic structures" admin>
      <div className="content-width admin-page">
        <section className="page-heading compact"><div><span className="eyebrow">Versioned structures</span><h1>Programmes and pathways</h1><p>Degree rules, majors, minors and specialisations for the selected academic year.</p></div></section>
        <section className="structure-kpis"><article><GraduationCap size={18} /><span><strong>82</strong><small>degree programmes</small></span></article><article><Shapes size={18} /><span><strong>434</strong><small>majors, minors and specialisations</small></span></article><article><BookOpen size={18} /><span><strong>2,146</strong><small>requirement buckets</small></span></article></section>

        <section className="admin-grid-panel structures-panel">
          <div className="admin-grid-toolbar"><label className="grid-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code or structure name" /><span>{filtered.length} sample rows</span></label><label><span>Type</span><select value={type} onChange={(event) => setType(event.target.value)}><option>All structures</option><option>Degree</option><option>Major</option><option>Minor</option><option>Specialisation</option></select></label></div>
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Structure</th><th>Type</th><th>Units</th><th>Programmes</th><th>Course options</th><th>Review state</th><th>Last changed</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.code}><td><button className="table-entity-button" type="button" onClick={() => setSelected(row)}><strong>{row.code}</strong><small>{row.name}</small></button></td><td><span className="badge neutral">{row.type}</span></td><td>{row.units}</td><td>{row.programmes}</td><td>{row.options}</td><td><span className={`badge ${row.state.toLowerCase()}`}>{row.state}</span></td><td>{row.changed}</td><td><button className="icon-button" type="button" onClick={() => setSelected(row)} aria-label={`Inspect ${row.code}`}><ArrowRight size={15} /></button></td></tr>)}</tbody></table></div>
        </section>

        {selected && <aside className="inline-detail-panel"><header><div><span className="eyebrow">{selected.type}</span><h2>{selected.name}</h2><p>{selected.code} · 2026 version</p></div><button className="button ghost" type="button" onClick={() => setSelected(null)}>Close</button></header><div className="structure-buckets"><span><strong>Global constraints</strong><small>{selected.units} total units · catalogue-year locked</small></span><span><strong>Compulsory courses</strong><small>{Math.max(4, Math.round(selected.options / 2))} parsed course requirements</small></span><span><strong>Choice groups</strong><small>{Math.max(1, Math.round(selected.options / 3))} one-of or unit-based buckets</small></span><span><strong>Elective rules</strong><small>Level, subject and programme eligibility retained</small></span></div><button className="button secondary" type="button" onClick={() => notify(`${selected.code} queued for rule comparison`)}>Compare with 2025</button></aside>}
      </div>
    </AppShell>
  );
}
