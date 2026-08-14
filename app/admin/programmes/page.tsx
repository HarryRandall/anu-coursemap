"use client";

import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Search,
  Shapes,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Drawer } from "@/components/ui/overlay";
import { Card } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { parseTone } from "@/lib/ui";
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
  ...degrees.map((degree, index) => ({
    code: degree.code,
    name: degree.name,
    type: "Degree",
    units: degree.units,
    programmes: 1,
    options: 5 + index,
    state: "Verified",
    changed: "8 Aug 2026",
  })),
  ...majors.map((major, index) => ({
    code: major.code,
    name: major.name,
    type: "Major",
    units: major.units,
    programmes: index === 0 ? 4 : 3,
    options: major.courseCodes.length,
    state: index === 4 ? "Review" : "Automatic",
    changed: index === 2 ? "2 Aug 2026" : "12 Jul 2026",
  })),
  {
    code: "CYBR-MIN",
    name: "Cyber Security",
    type: "Minor",
    units: 24,
    programmes: 6,
    options: 8,
    state: "Automatic",
    changed: "12 Jul 2026",
  },
  {
    code: "HCI-SPEC",
    name: "Human-Centred Computing",
    type: "Specialisation",
    units: 24,
    programmes: 2,
    options: 7,
    state: "Review",
    changed: "5 Aug 2026",
  },
];

const kpis = [
  {
    icon: <GraduationCap size={18} />,
    value: "82",
    label: "degree programmes",
  },
  {
    icon: <Shapes size={18} />,
    value: "434",
    label: "majors, minors and specialisations",
  },
  {
    icon: <BookOpen size={18} />,
    value: "2,146",
    label: "requirement buckets",
  },
];

export default function AdminProgrammesPage() {
  const { notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All structures");
  const [selected, setSelected] = useState<StructureRow | null>(null);

  const filtered = useMemo(
    () =>
      structures.filter(
        (row) =>
          `${row.code} ${row.name}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (type === "All structures" || row.type === type),
      ),
    [query, type],
  );

  return (
    <AppShell
      title="Programmes"
      subtitle="Degrees and academic structures"
      admin
    >
      <h1 className="sr-only">Programmes and pathways</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              {kpi.icon}
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-zinc-900">
                {kpi.value}
              </p>
              <p className="text-[11px] text-zinc-400">{kpi.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-end">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset">
            <Search size={16} className="text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code or structure name"
              className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-zinc-400 focus:outline-none"
            />
            <span className="shrink-0 text-[11px] text-zinc-400">
              {filtered.length} rows
            </span>
          </label>
          <Field label="Type" className="w-44">
            <Select
              aria-label="Structure type"
              value={type}
              onChange={setType}
              options={[
                "All structures",
                "Degree",
                "Major",
                "Minor",
                "Specialisation",
              ].map((item) => ({ value: item, label: item }))}
            />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                {[
                  "Structure",
                  "Type",
                  "Units",
                  "Programmes",
                  "Options",
                  "State",
                  "Changed",
                  "",
                ].map((head, index) => (
                  <th
                    key={index}
                    className="px-3 py-2.5 whitespace-nowrap first:pl-4"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((row) => (
                <tr
                  key={row.code}
                  onClick={() => setSelected(row)}
                  className="cursor-pointer transition hover:bg-zinc-50/70"
                >
                  <td className="px-3 py-3 pl-4">
                    <span className="block font-mono text-[12px] font-semibold text-zinc-900">
                      {row.code}
                    </span>
                    <span className="block text-[11px] text-zinc-400">
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone="neutral">{row.type}</Badge>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{row.units}</td>
                  <td className="px-3 py-3 text-zinc-600">{row.programmes}</td>
                  <td className="px-3 py-3 text-zinc-600">{row.options}</td>
                  <td className="px-3 py-3">
                    <Badge tone={parseTone(row.state)}>{row.state}</Badge>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-zinc-500">
                    {row.changed}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      aria-label={`Inspect ${row.code}`}
                      className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <Drawer
          onClose={() => setSelected(null)}
          labelledBy="programme-detail-title"
          className="sm:w-[480px]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 font-mono text-[11px] font-bold text-brand-700">
                {selected.code.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">
                  {selected.type}
                </p>
                <p
                  id="programme-detail-title"
                  className="truncate text-[13px] font-semibold text-zinc-900"
                >
                  {selected.code}
                </p>
              </div>
            </div>
            <IconButton label="Close" onClick={() => setSelected(null)}>
              <X size={18} />
            </IconButton>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <h2 className="text-xl leading-tight font-bold tracking-tight text-zinc-900">
              {selected.name}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {selected.code} · 2026 version
            </p>

            <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-200 rounded-xl ring-1 ring-zinc-200">
              {[
                ["Units", String(selected.units)],
                ["Programmes", String(selected.programmes)],
                ["Options", String(selected.options)],
              ].map(([label, value]) => (
                <div key={label} className="px-3 py-2.5">
                  <p className="text-[10px] tracking-wide text-zinc-400 uppercase">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold tracking-tight text-zinc-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Badge tone={parseTone(selected.state)}>{selected.state}</Badge>
            </div>

            <section className="mt-6 border-t border-zinc-100 pt-5">
              <h3 className="text-[13px] font-semibold text-zinc-900">
                Requirement structure
              </h3>
              <div className="mt-3 flex flex-col gap-2.5">
                {[
                  [
                    "Global constraints",
                    `${selected.units} total units · catalogue-year locked`,
                  ],
                  [
                    "Compulsory courses",
                    `${Math.max(4, Math.round(selected.options / 2))} parsed course requirements`,
                  ],
                  [
                    "Choice groups",
                    `${Math.max(1, Math.round(selected.options / 3))} one-of or unit-based buckets`,
                  ],
                  [
                    "Elective rules",
                    "Level, subject and programme eligibility retained",
                  ],
                ].map(([title, note]) => (
                  <div
                    key={title}
                    className="rounded-xl bg-zinc-50/70 p-3 ring-1 ring-zinc-200"
                  >
                    <p className="text-[12px] font-semibold text-zinc-800">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 border-t border-zinc-100 pt-5">
              <h3 className="text-[13px] font-semibold text-zinc-900">
                Source snapshot
              </h3>
              <div className="mt-3 divide-y divide-zinc-100 rounded-xl text-[12px] ring-1 ring-zinc-200">
                {[
                  ["Version", "2026 catalogue"],
                  ["Last changed", selected.changed],
                  ["Review state", selected.state],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="text-zinc-400">{label}</span>
                    <span className="font-medium text-zinc-700">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="flex items-center gap-2 border-t border-zinc-100 px-5 py-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() =>
                notify(`${selected.code} queued for rule comparison`)
              }
            >
              Compare with 2025
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() =>
                notify(`${selected.code} rules opened for edit (prototype)`)
              }
            >
              Edit rules
            </Button>
          </footer>
        </Drawer>
      )}
    </AppShell>
  );
}
