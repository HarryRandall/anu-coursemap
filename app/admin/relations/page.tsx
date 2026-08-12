"use client";

import { Check, GitBranch, Network, Search, Table2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Relation, relations } from "@/lib/catalogue";

export default function AdminRelationsPage() {
  const { notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [relationType, setRelationType] = useState("All relations");
  const [reviewState, setReviewState] = useState("All states");
  const [view, setView] = useState<"table" | "graph">("table");
  const [selected, setSelected] = useState<Relation | null>(relations[1]);
  const types = [...new Set(relations.map((item) => item.relation))];
  const filtered = useMemo(() => relations.filter((item) => `${item.source} ${item.target} ${item.sourceText}`.toLowerCase().includes(query.toLowerCase()) && (relationType === "All relations" || item.relation === relationType) && (reviewState === "All states" || item.state === reviewState)), [query, relationType, reviewState]);

  return (
    <AppShell title="Relations" subtitle="Academic rule graph" admin>
      <div className="content-width admin-page relations-page">
        <section className="page-heading compact"><div><span className="eyebrow">Derived edges + semantic trees</span><h1>Rule relations</h1><p>Searchable graph edges without flattening the original AND/OR rule structure.</p></div><div className="view-switch labelled"><button className={view === "table" ? "active" : ""} type="button" onClick={() => setView("table")}><Table2 size={16} /> Table</button><button className={view === "graph" ? "active" : ""} type="button" onClick={() => setView("graph")}><Network size={16} /> Graph</button></div></section>

        <section className="relation-workspace">
          <div className="relation-main">
            <div className="admin-grid-toolbar"><label className="grid-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source, target or source text" /><span>{filtered.length} edges</span></label><label><span>Relation</span><select value={relationType} onChange={(event) => setRelationType(event.target.value)}><option>All relations</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>State</span><select value={reviewState} onChange={(event) => setReviewState(event.target.value)}><option>All states</option><option>Verified</option><option>Automatic</option><option>Review</option></select></label></div>
            {view === "table" ? <div className="admin-table-scroll"><table className="admin-table relations-table"><thead><tr><th>Source</th><th>Relation</th><th>Target</th><th>Rule group</th><th>Hardness</th><th>Confidence</th><th>State</th></tr></thead><tbody>{filtered.map((relation) => <tr className={selected?.id === relation.id ? "selected" : ""} key={relation.id} onClick={() => setSelected(relation)}><td><strong>{relation.source}</strong></td><td><span className="relation-pill"><GitBranch size={13} />{relation.relation}</span></td><td><strong>{relation.target}</strong></td><td><code>{relation.group}</code></td><td>{relation.hardness}</td><td><span className="confidence"><i style={{ width: `${relation.confidence}%` }} />{relation.confidence}%</span></td><td><span className={`badge ${relation.state.toLowerCase()}`}>{relation.state}</span></td></tr>)}</tbody></table></div> : <div className="relation-graph" role="img" aria-label="Course prerequisite relationship graph"><div className="graph-column"><span className="graph-label">Prerequisite</span>{["COMP1100", "COMP1600", "MATH1005", "COMP1110"].map((code) => <button type="button" key={code} onClick={() => setQuery(code)}>{code}</button>)}</div><div className="graph-connectors"><span>requires</span><i /><span>unlocks</span></div><div className="graph-column targets"><span className="graph-label">Course</span>{["COMP1110", "COMP2100", "COMP2300", "COMP2610"].map((code) => <button type="button" key={code} onClick={() => setQuery(code)}>{code}</button>)}</div><div className="graph-note"><Network size={16} /><span><strong>Derived view</strong><small>Click a node to filter the underlying relation records.</small></span></div></div>}
          </div>

          <aside className="relation-inspector">
            {selected ? <><header><span className={`review-mark ${selected.state.toLowerCase()}`}>{selected.state === "Review" ? <TriangleAlert size={17} /> : <Check size={17} />}</span><span><small>Selected relation</small><strong>{selected.source} → {selected.target}</strong></span></header><section><span className="eyebrow">Relation</span><h2>{selected.relation}</h2><dl><div><dt>Rule group</dt><dd><code>{selected.group}</code></dd></div><div><dt>Hardness</dt><dd>{selected.hardness}</dd></div><div><dt>Confidence</dt><dd>{selected.confidence}%</dd></div><div><dt>Review state</dt><dd>{selected.state}</dd></div></dl></section><section><span className="eyebrow">Original source text</span><blockquote>{selected.sourceText}</blockquote><p>The source span stays attached to the semantic tree and this derived edge.</p></section>{selected.state === "Review" && <footer><button className="button primary full" type="button" onClick={() => notify(`${selected.id} accepted for this prototype`)}><Check size={15} /> Accept parsed relation</button><button className="button secondary full" type="button" onClick={() => notify("Manual override draft opened")}>Create override</button></footer>}</> : <div className="preview-placeholder"><GitBranch size={24} /><strong>Select a relation</strong></div>}
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
