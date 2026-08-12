"use client";

import { Check, GraduationCap, RotateCcw, Save, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { degrees, majors } from "@/lib/catalogue";

export default function ProfilePage() {
  const { state, ready, updateProfile, resetDemo, notify } = useCoursemap();
  const [draft, setDraft] = useState(state.profile);

  useEffect(() => {
    if (!ready) return;
    const profile = state.profile;
    window.queueMicrotask(() => setDraft(profile));
  }, [ready, state.profile]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.studentId.trim()) {
      notify("Add your name and student ID before saving");
      return;
    }
    updateProfile(draft);
    notify("Profile and academic plan saved");
  };

  const reset = () => {
    if (!window.confirm("Reset your local Coursemap demo data?")) return;
    resetDemo();
    notify("Demo profile and plan restored");
  };

  return (
    <AppShell title="Profile" subtitle="Your details and academic plan">
      <form className="content-width profile-page" onSubmit={save}>
        <section className="page-heading compact">
          <div><span className="eyebrow">Personal settings</span><h1>Set up Coursemap for you.</h1><p>Choose the degree rules and pathway your plan should evaluate against.</p></div>
          <button className="button primary" type="submit"><Save size={16} /> Save changes</button>
        </section>

        <div className="profile-layout">
          <div className="settings-stack">
            <section className="settings-card">
              <header><span className="settings-icon"><UserRound size={18} /></span><div><h2>Student profile</h2><p>Used only on this device in the prototype.</p></div></header>
              <div className="form-grid">
                <label className="field"><span>Full name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Your name" /></label>
                <label className="field"><span>Student ID</span><input value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })} placeholder="u1234567" /></label>
                <label className="field wide"><span>Email</span><input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="name@anu.edu.au" /></label>
                <label className="field"><span>Commencement year</span><select value={draft.commencementYear} onChange={(event) => setDraft({ ...draft, commencementYear: Number(event.target.value) })}><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option><option value={2027}>2027</option></select></label>
                <label className="field"><span>Study load</span><select value={draft.studyLoad} onChange={(event) => setDraft({ ...draft, studyLoad: event.target.value as "Full time" | "Part time" })}><option>Full time</option><option>Part time</option></select></label>
              </div>
            </section>

            <section className="settings-card" id="academic-plan">
              <header><span className="settings-icon violet"><GraduationCap size={18} /></span><div><h2>Degree and rules year</h2><p>Your catalogue year stays attached to every decision.</p></div></header>
              <div className="degree-options">
                {degrees.map((degree) => (
                  <button className={draft.degreeCode === degree.code ? "degree-option selected" : "degree-option"} type="button" key={degree.code} onClick={() => setDraft({ ...draft, degreeCode: degree.code })}>
                    <span className="degree-code">{degree.code.slice(0, 2)}</span>
                    <span><strong>{degree.name}</strong><small>{degree.code} · {degree.duration} years · {degree.units} units</small><p>{degree.description}</p></span>
                    <span className="choice-check">{draft.degreeCode === degree.code && <Check size={14} />}</span>
                  </button>
                ))}
              </div>
              <label className="field rules-year-field"><span>Rules year</span><select value={draft.catalogueYear} onChange={(event) => setDraft({ ...draft, catalogueYear: Number(event.target.value) })}><option value={2024}>2024 catalogue</option><option value={2025}>2025 catalogue</option><option value={2026}>2026 catalogue</option></select><small>Course and programme rules are evaluated for this specific year.</small></label>
            </section>

            <section className="settings-card">
              <header><span className="settings-icon mint"><GraduationCap size={18} /></span><div><h2>Major</h2><p>You can change this later and compare how completed courses carry across.</p></div></header>
              <div className="major-card-grid">
                {majors.map((major) => (
                  <button className={draft.majorCode === major.code ? "major-card selected" : "major-card"} type="button" key={major.code} onClick={() => setDraft({ ...draft, majorCode: major.code })} style={{ "--major-colour": major.colour } as React.CSSProperties}>
                    <span className="major-colour" />
                    <span><strong>{major.name}</strong><small>{major.code} · {major.units} units</small><p>{major.description}</p></span>
                    <span className="choice-check">{draft.majorCode === major.code && <Check size={14} />}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="profile-summary-card">
            <span className="avatar large">{draft.name.split(" ").map((item) => item[0]).join("").slice(0, 2).toUpperCase() || "?"}</span>
            <h2>{draft.name || "Your profile"}</h2>
            <p>{draft.studentId || "No student ID"}</p>
            <dl><div><dt>Degree</dt><dd>{degrees.find((item) => item.code === draft.degreeCode)?.name}</dd></div><div><dt>Major</dt><dd>{majors.find((item) => item.code === draft.majorCode)?.name}</dd></div><div><dt>Rules</dt><dd>{draft.catalogueYear} catalogue</dd></div><div><dt>Load</dt><dd>{draft.studyLoad}</dd></div></dl>
            <div className="local-note"><Check size={16} /><span><strong>Saved locally for now</strong><p>Ready to move to Supabase when the database is connected.</p></span></div>
            <button className="button ghost danger full" type="button" onClick={reset}><RotateCcw size={15} /> Reset demo data</button>
          </aside>
        </div>
      </form>
    </AppShell>
  );
}
