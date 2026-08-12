"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";

type Run = {
  id: string;
  scope: string;
  trigger: string;
  started: string;
  duration: string;
  checked: number;
  added: number;
  changed: number;
  unchanged: number;
  failed: number;
  status: "Complete" | "Failed";
};

const initialRuns: Run[] = [
  { id: "run_8f3c12", scope: "2026 courses", trigger: "Schedule", started: "12 Aug, 2:15 am", duration: "9m 14s", checked: 3012, added: 0, changed: 3, unchanged: 3009, failed: 0, status: "Complete" },
  { id: "run_5da910", scope: "2026 programmes", trigger: "Schedule", started: "12 Aug, 2:05 am", duration: "4m 32s", checked: 516, added: 0, changed: 0, unchanged: 516, failed: 0, status: "Complete" },
  { id: "run_29ac44", scope: "2025 failed items", trigger: "Harry", started: "11 Aug, 4:42 pm", duration: "1m 08s", checked: 9, added: 0, changed: 2, unchanged: 6, failed: 1, status: "Failed" },
  { id: "run_11b7e0", scope: "2026 courses", trigger: "Schedule", started: "11 Aug, 2:15 am", duration: "8m 58s", checked: 3012, added: 0, changed: 0, unchanged: 3012, failed: 0, status: "Complete" },
];

export default function AdminSyncPage() {
  const { notify } = useCoursemap();
  const [scope, setScope] = useState("2026 courses and programmes");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runs, setRuns] = useState(initialRuns);
  const [advanced, setAdvanced] = useState(false);
  const [requestGap, setRequestGap] = useState(5);
  const [currentSchedule, setCurrentSchedule] = useState(true);
  const [nextSchedule, setNextSchedule] = useState(true);
  const [previousSchedule, setPreviousSchedule] = useState(true);

  useEffect(() => {
    if (!running) return;
    let current = 2;
    const timer = window.setInterval(() => {
      current = Math.min(100, current + 8);
      setProgress(current);
      if (current >= 100) {
        window.clearInterval(timer);
        setRunning(false);
        setRuns((existing) => [{ id: "run_demo_new", scope, trigger: "Harry", started: "Just now", duration: "3s demo", checked: 3012, added: 0, changed: 3, unchanged: 3009, failed: 0, status: "Complete" }, ...existing]);
        notify("Incremental sync simulation completed");
      }
    }, 220);
    return () => window.clearInterval(timer);
  }, [notify, running, scope]);

  const stage = !running && progress >= 100
    ? "Complete"
    : progress < 22
      ? "Discovering entity pages"
      : progress < 60
        ? "Comparing content hashes"
        : progress < 88
          ? "Parsing changed pages"
          : "Validating relations";

  const start = (full = false) => {
    if (full && !window.confirm("Run a full historical sync? This would inspect about 56,846 pages when a backend is connected.")) return;
    setProgress(2);
    setRunning(true);
    notify(full ? "Historical sync simulation started" : "Incremental sync simulation started");
  };

  return (
    <AppShell title="Sync" subtitle="Schedules, runs and changed-page checks" admin>
      <div className="content-width admin-page sync-page">
        <section className="page-heading compact"><div><span className="eyebrow">Scraper operations</span><h1>Sync only what changed.</h1><p>Hash unchanged pages, preserve valid catalogue data and reparse only the differences.</p></div></section>

        <section className="sync-launch-card">
          <div className="sync-launch-top">
            <span className={running ? "sync-orb running" : "sync-orb"}>{running ? <RefreshCw size={21} /> : <Zap size={21} />}</span>
            <div><span className="eyebrow">Incremental sync</span><h2>{running ? stage : "Ready to check the catalogue"}</h2><p>{running ? `${progress}% complete · mock run` : "Unchanged content skips parsing and database writes."}</p></div>
            <label className="sync-scope"><span>Scope</span><select value={scope} onChange={(event) => setScope(event.target.value)} disabled={running}><option>2026 courses and programmes</option><option>2026 courses only</option><option>2026 programmes only</option><option>2025 failed items</option></select></label>
            <button className="button primary" type="button" disabled={running} onClick={() => start(false)}>{running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}{running ? "Running" : "Run incremental sync"}</button>
          </div>
          <div className="sync-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="sync-stages"><span className={progress >= 20 ? "done" : "active"}>Discover</span><span className={progress >= 55 ? "done" : progress >= 20 ? "active" : ""}>Compare hashes</span><span className={progress >= 85 ? "done" : progress >= 55 ? "active" : ""}>Parse changes</span><span className={progress >= 100 ? "done" : progress >= 85 ? "active" : ""}>Validate</span></div>
        </section>

        <section className="sync-layout">
          <div className="schedule-card">
            <header><div><h2>Schedule</h2><p>Cheap checks for active years, fewer checks for stable history.</p></div><Clock3 size={18} /></header>
            <div className="schedule-list">
              <label><span><strong>Current catalogue year</strong><small>2026 · daily at 2:15 am</small></span><input aria-label="Enable current catalogue year schedule" type="checkbox" checked={currentSchedule} onChange={(event) => { setCurrentSchedule(event.target.checked); notify(event.target.checked ? "Current-year schedule enabled" : "Current-year schedule paused"); }} /></label>
              <label><span><strong>Next catalogue year</strong><small>2027 · daily once published</small></span><input aria-label="Enable next catalogue year schedule" type="checkbox" checked={nextSchedule} onChange={(event) => { setNextSchedule(event.target.checked); notify(event.target.checked ? "Next-year schedule enabled" : "Next-year schedule paused"); }} /></label>
              <label><span><strong>Previous catalogue year</strong><small>2025 · weekly on Sunday</small></span><input aria-label="Enable previous catalogue year schedule" type="checkbox" checked={previousSchedule} onChange={(event) => { setPreviousSchedule(event.target.checked); notify(event.target.checked ? "Previous-year schedule enabled" : "Previous-year schedule paused"); }} /></label>
              <div><span><strong>Older historical years</strong><small>Frozen · manual recheck only</small></span><span className="badge neutral">Manual</span></div>
            </div>
          </div>

          <div className="sync-economics-card">
            <header><div><h2>Why this stays cheap</h2><p>Typical daily run with very low catalogue churn.</p></div></header>
            <div className="economics-flow"><span><strong>3,012</strong><small>pages checked</small></span><i>→</i><span><strong>3</strong><small>hashes changed</small></span><i>→</i><span><strong>3</strong><small>rows reparsed</small></span></div>
            <div className="economics-note"><CheckCircle2 size={16} /><span><strong>3,009 database writes avoided</strong><small>Source snapshots remain versioned and unchanged history stays frozen.</small></span></div>
          </div>
        </section>

        <section className="advanced-sync-card">
          <button type="button" onClick={() => setAdvanced((current) => !current)}><Settings2 size={17} /><span><strong>Advanced sync settings</strong><small>Request gap, hash strategy and historical scope</small></span><ChevronDown className={advanced ? "rotated" : ""} size={17} /></button>
          {advanced && <div className="advanced-fields"><label className="field"><span>Request gap</span><div className="input-suffix"><input type="number" min={5} max={1000} value={requestGap} onChange={(event) => setRequestGap(Math.max(5, Number(event.target.value)))} /><span>ms</span></div><small>Minimum 5 ms in this prototype. Production should follow live site policy and observed rate limits.</small></label><label className="field"><span>Change detection</span><select><option>Content hash + HTTP validators</option><option>Content hash only</option></select><small>ETag and Last-Modified avoid unnecessary response bodies where supported.</small></label><div className="historical-action"><span><strong>Full historical sync</strong><small>About 56,846 course pages. Use only for initial backfill or parser migration.</small></span><button className="button secondary danger" type="button" disabled={running} onClick={() => start(true)}>Run full history</button></div></div>}
        </section>

        <section className="admin-grid-panel sync-history-panel">
          <header className="panel-header"><div><h2>Run history</h2><p>Discovery, changes, failures and trigger details.</p></div><span className="badge neutral">{runs.length} sample runs</span></header>
          <div className="admin-table-scroll"><table className="admin-table sync-table"><thead><tr><th>Run</th><th>Scope</th><th>Trigger</th><th>Started</th><th>Duration</th><th>Checked</th><th>Added</th><th>Changed</th><th>Unchanged</th><th>Failed</th><th>Status</th><th /></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td><code>{run.id}</code></td><td>{run.scope}</td><td>{run.trigger}</td><td>{run.started}</td><td>{run.duration}</td><td>{run.checked.toLocaleString()}</td><td>{run.added}</td><td>{run.changed}</td><td>{run.unchanged.toLocaleString()}</td><td>{run.failed}</td><td><span className={run.status === "Complete" ? "badge success" : "badge error"}>{run.status === "Complete" ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}{run.status}</span></td><td>{run.failed > 0 && <button className="icon-button" type="button" onClick={() => { setScope("2025 failed items"); start(false); }} aria-label={`Retry failures from ${run.id}`}><RotateCcw size={14} /></button>}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </AppShell>
  );
}
