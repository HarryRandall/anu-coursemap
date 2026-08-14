"use client";

import Link from "next/link";
import { ExternalLink, RotateCcw, Save, X } from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { Drawer } from "@/components/ui/overlay";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { CourseToken } from "@/components/ui/course-token";
import { parseTone } from "@/lib/ui";
import type { Course } from "@/lib/catalogue";

type Draft = {
  name: string;
  units: number;
  level: number;
  convener: string;
  school: string;
  sessions: string;
  prerequisiteText: string;
  sourceUrl: string;
  parseState: Course["parseState"];
};

export function AdminCourseEditor({ course, onClose }: { course: Course; onClose: () => void }) {
  const { notify } = useCoursemap();
  const initial: Draft = {
    name: course.name,
    units: course.units,
    level: course.level,
    convener: course.convener,
    school: course.school,
    sessions: course.sessions.join(", "),
    prerequisiteText: course.prerequisiteText,
    sourceUrl: course.sourceUrl,
    parseState: course.parseState,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Drawer onClose={onClose} labelledBy="course-editor-title" className="sm:w-[480px]">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <CourseToken code={course.code} accent={course.accent} />
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-zinc-400">{course.code}</p>
            <p id="course-editor-title" className="truncate text-[13px] font-semibold text-zinc-900">
              Edit source data
            </p>
          </div>
        </div>
        <IconButton label="Close editor" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Source provenance */}
        <div className="flex items-center justify-between rounded-xl bg-zinc-50/70 p-3 ring-1 ring-zinc-200">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Source</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              ANU Programs &amp; Courses · changed {course.lastChanged}
            </p>
          </div>
          <Link
            href={course.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-white hover:text-zinc-700"
            aria-label="Open ANU source"
          >
            <ExternalLink size={15} />
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Course title">
            <Input value={draft.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Units">
              <Input
                type="number"
                value={draft.units}
                onChange={(event) => set("units", Number(event.target.value))}
              />
            </Field>
            <Field label="Level">
              <Select
                aria-label="Level"
                value={draft.level}
                onChange={(value) => set("level", value)}
                options={[1000, 2000, 3000, 4000, 6000].map((level) => ({
                  value: level,
                  label: String(level),
                }))}
              />
            </Field>
          </div>
          <Field label="Convener">
            <Input value={draft.convener} onChange={(event) => set("convener", event.target.value)} />
          </Field>
          <Field label="School">
            <Input value={draft.school} onChange={(event) => set("school", event.target.value)} />
          </Field>
          <Field label="Sessions" hint="Comma-separated, e.g. Semester 1, Semester 2">
            <Input value={draft.sessions} onChange={(event) => set("sessions", event.target.value)} />
          </Field>
          <Field label="Prerequisite (raw text)">
            <Input
              value={draft.prerequisiteText}
              onChange={(event) => set("prerequisiteText", event.target.value)}
            />
          </Field>
          <Field label="Source URL">
            <Input value={draft.sourceUrl} onChange={(event) => set("sourceUrl", event.target.value)} />
          </Field>
          <Field label="Parse state">
            <div className="flex items-center gap-3">
              <Select
                aria-label="Parse state"
                value={draft.parseState}
                onChange={(value) => set("parseState", value as Course["parseState"])}
                options={(["Verified", "Automatic", "Review"] as const).map((item) => ({
                  value: item,
                  label: item,
                }))}
                className="flex-1"
              />
              <Badge tone={parseTone(draft.parseState)}>{draft.parseState}</Badge>
            </div>
          </Field>
        </div>

        <ButtonLink variant="secondary" fullWidth href={`/courses/${course.code}`} className="mt-6">
          Open student course page <ExternalLink size={15} />
        </ButtonLink>
      </div>

      <footer className="flex items-center gap-2 border-t border-zinc-100 px-5 py-4">
        <Button
          variant="ghost"
          disabled={!dirty}
          onClick={() => setDraft(initial)}
        >
          <RotateCcw size={15} /> Reset
        </Button>
        <Button
          variant="primary"
          fullWidth
          disabled={!dirty}
          onClick={() => {
            notify(`${course.code} draft saved (prototype)`);
            onClose();
          }}
        >
          <Save size={15} /> Save changes
        </Button>
      </footer>
    </Drawer>
  );
}
