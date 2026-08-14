"use client";

import { ExternalLink, FilterX, Pencil, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import { AdminCourseEditor } from "@/components/admin/course-editor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { parseTone } from "@/lib/ui";
import { courses, type Course } from "@/lib/catalogue";

export default function AdminCoursesPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All levels");
  const [stateFilter, setStateFilter] = useState("All states");
  const [editing, setEditing] = useState<Course | null>(null);

  const filtered = useMemo(
    () =>
      courses.filter(
        (course) =>
          `${course.code} ${course.name} ${course.convener}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (level === "All levels" || String(course.level / 1000) === level) &&
          (stateFilter === "All states" || course.parseState === stateFilter),
      ),
    [query, level, stateFilter],
  );

  return (
    <AppShell title="Course data" subtitle="Versioned course grid" admin>
      <h1 className="sr-only">Courses grid</h1>

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 lg:flex-row lg:items-end">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset">
            <Search size={16} className="text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code, name or convener"
              className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-zinc-400 focus:outline-none"
            />
            <span className="shrink-0 text-[11px] text-zinc-400">
              {filtered.length} rows
            </span>
          </label>
          <div className="flex items-end gap-3">
            <Field label="Level" className="w-32">
              <Select
                aria-label="Level"
                value={level}
                onChange={setLevel}
                options={[
                  { value: "All levels", label: "All levels" },
                  { value: "1", label: "Level 1" },
                  { value: "2", label: "Level 2" },
                  { value: "3", label: "Level 3" },
                ]}
              />
            </Field>
            <Field label="Parse state" className="w-40">
              <Select
                aria-label="Parse state"
                value={stateFilter}
                onChange={setStateFilter}
                options={["All states", "Verified", "Automatic", "Review"].map(
                  (item) => ({ value: item, label: item }),
                )}
              />
            </Field>
            <Button
              variant="ghost"
              className="h-10"
              onClick={() => {
                setQuery("");
                setLevel("All levels");
                setStateFilter("All states");
              }}
            >
              <FilterX size={15} /> Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                {[
                  "Course",
                  "Year",
                  "Units",
                  "Level",
                  "Sessions",
                  "Convener",
                  "Prereqs",
                  "Used by",
                  "State",
                  "Changed",
                  "",
                ].map((head, index) => (
                  <th
                    key={index}
                    className="px-3 py-2.5 font-bold whitespace-nowrap"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((course) => (
                <tr
                  key={course.code}
                  onClick={() => setEditing(course)}
                  className="cursor-pointer transition hover:bg-zinc-50/70"
                >
                  <td className="px-4 py-3">
                    <span className="block font-mono text-[12px] font-semibold text-zinc-900">
                      {course.code}
                    </span>
                    <span className="block max-w-56 truncate text-[11px] text-zinc-400">
                      {course.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{course.year}</td>
                  <td className="px-3 py-3 text-zinc-600">{course.units}</td>
                  <td className="px-3 py-3 text-zinc-600">{course.level}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-zinc-600">
                    {course.sessions
                      .map((item) => item.replace("Semester ", "S"))
                      .join(" · ")}
                  </td>
                  <td className="px-3 py-3">
                    <span className="block max-w-40 truncate font-medium text-zinc-700">
                      {course.convener}
                    </span>
                    <span className="block max-w-40 truncate text-[11px] text-zinc-400">
                      {course.school}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">
                    {course.prerequisiteCodes.length}
                  </td>
                  <td className="px-3 py-3 text-zinc-600">
                    {course.countsTowards.length}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={parseTone(course.parseState)}>
                      {course.parseState}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-zinc-500">
                    {course.lastChanged}
                  </td>
                  <td
                    className="px-3 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(course)}
                        aria-label={`Edit ${course.code}`}
                        className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Pencil size={14} />
                      </button>
                      <a
                        href={course.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ANU source for ${course.code}`}
                        className="grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5 text-[11px] text-zinc-400 sm:flex-row sm:justify-between">
          <span>
            Showing {filtered.length} sample rows from 3,012 course versions
          </span>
          <span>Prototype data · database connection TBD</span>
        </div>
      </Card>

      {editing && (
        <AdminCourseEditor course={editing} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}
