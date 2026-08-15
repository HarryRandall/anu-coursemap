"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Search, Shapes } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
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
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All structures");

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
      actions={
        <ButtonLink href="/admin/sync" size="sm">
          Import a programme
        </ButtonLink>
      }
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
                <tr key={row.code} className="transition hover:bg-zinc-50/70">
                  <td className="px-3 py-3 pl-4">
                    <Link
                      href={`/admin/programmes/${row.code}`}
                      className="block rounded font-mono text-[12px] font-semibold text-zinc-900 outline-none hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      {row.code}
                    </Link>
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
                    <Link
                      href={`/admin/programmes/${row.code}`}
                      aria-label={`Inspect ${row.code}`}
                      className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <span aria-hidden="true">→</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
