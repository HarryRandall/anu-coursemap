"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Braces,
  CheckCircle2,
  Clock3,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/shell";

const changes = [0, 2, 1, 0, 4, 0, 3];

export default function AdminOverviewPage() {
  return (
    <AppShell title="Catalogue overview" subtitle="Mock admin data · Supabase ready" admin>
      <div className="content-width admin-page">
        <section className="page-heading compact">
          <div><span className="eyebrow">Data operations</span><h1>Catalogue health at a glance.</h1><p>Inspect parsed ANU entities, relation quality and incremental sync activity.</p></div>
          <Link className="button primary" href="/admin/sync"><RefreshCw size={16} /> Start scoped sync</Link>
        </section>

        <section className="admin-kpis">
          <article><span className="kpi-icon violet"><BookOpen size={18} /></span><span><small>Course versions</small><strong>3,012</strong><p>2026 catalogue</p></span><Link href="/admin/courses"><ArrowRight size={16} /></Link></article>
          <article><span className="kpi-icon blue"><Braces size={18} /></span><span><small>Programmes & structures</small><strong>516</strong><p>Degrees, majors and minors</p></span><Link href="/admin/programmes"><ArrowRight size={16} /></Link></article>
          <article><span className="kpi-icon mint"><GitBranch size={18} /></span><span><small>Parsed relations</small><strong>8,742</strong><p>97.9% automatic confidence</p></span><Link href="/admin/relations"><ArrowRight size={16} /></Link></article>
          <article><span className="kpi-icon amber"><AlertTriangle size={18} /></span><span><small>Needs review</small><strong>47</strong><p>21 mixed AND/OR rules</p></span><Link href="/admin/relations?state=review"><ArrowRight size={16} /></Link></article>
        </section>

        <section className="admin-dashboard-grid">
          <article className="dashboard-card change-chart-card">
            <header><div><h2>Changed pages</h2><p>Daily incremental checks · last 7 runs</p></div><span className="badge success">Low churn</span></header>
            <div className="change-chart" role="img" aria-label="Changed pages over seven sync runs: 0, 2, 1, 0, 4, 0, 3">
              {changes.map((value, index) => <span key={index}><i style={{ height: `${Math.max(5, value * 19)}%` }} /><strong>{value}</strong><small>{["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"][index]}</small></span>)}
            </div>
          </article>

          <article className="dashboard-card parse-card">
            <header><div><h2>Parse state</h2><p>Across 2026 versioned entities</p></div></header>
            <div className="parse-content">
              <div className="parse-donut" role="img" aria-label="94.8 percent automatic, 3.7 percent human reviewed, 1.5 percent needs review"><span><strong>98.5%</strong><small>usable</small></span></div>
              <div className="chart-legend"><span><i className="automatic" /><strong>Automatic</strong><small>94.8%</small></span><span><i className="reviewed" /><strong>Human reviewed</strong><small>3.7%</small></span><span><i className="needs-review" /><strong>Needs review</strong><small>1.5%</small></span></div>
            </div>
          </article>

          <article className="dashboard-card review-card">
            <header><div><h2>Review queue</h2><p>Issues grouped by parser finding</p></div><Link href="/admin/relations?state=review">Open queue <ArrowRight size={14} /></Link></header>
            <div className="review-bars">
              {[{ label: "Ambiguous AND/OR", value: 21, colour: "#635bdb" }, { label: "Unresolved code", value: 9, colour: "#e05f7e" }, { label: "Stale year link", value: 7, colour: "#ca7b16" }, { label: "Unit mismatch", value: 5, colour: "#2883d8" }, { label: "Other", value: 5, colour: "#8c8c96" }].map((item) => <span key={item.label}><span><strong>{item.label}</strong><small>{item.value}</small></span><i><b style={{ width: `${(item.value / 21) * 100}%`, background: item.colour }} /></i></span>)}
            </div>
          </article>

          <article className="dashboard-card latest-run-card">
            <header><div><h2>Latest catalogue run</h2><p>12 Aug 2026 at 2:15 am</p></div><span className="badge success"><CheckCircle2 size={12} /> Complete</span></header>
            <div className="run-summary"><span><strong>3,012</strong><small>checked</small></span><span><strong>3</strong><small>changed</small></span><span><strong>3,009</strong><small>unchanged</small></span><span><strong>0</strong><small>failed</small></span></div>
            <div className="run-meta"><Clock3 size={15} /><span><strong>9m 14s</strong><small>Incremental · 2026 courses</small></span><Link href="/admin/sync">View run <ArrowRight size={14} /></Link></div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
