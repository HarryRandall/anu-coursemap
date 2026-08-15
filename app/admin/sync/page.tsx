"use client";

import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { degrees } from "@/lib/catalogue";

const years = [2026, 2027] as const;

const programmeSuggestions = [
  ...degrees.map(({ code, name }) => ({ code, name })),
  { code: "ALLB", name: "Bachelor of Laws (Honours)" },
];

type ImportTarget = "programme" | "all";

function normaliseProgrammeCode(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9-]{1,24}$/.test(code) ? code : null;
}

export default function AdminSyncPage() {
  const [target, setTarget] = useState<ImportTarget>("programme");
  const [programmeQuery, setProgrammeQuery] = useState("");
  const [year, setYear] = useState<(typeof years)[number]>(2026);
  const [includeOptions, setIncludeOptions] = useState(true);
  const [includePrerequisites, setIncludePrerequisites] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const programmeCode = normaliseProgrammeCode(programmeQuery);
  const selectedProgramme = programmeSuggestions.find(
    (programme) => programme.code === programmeCode,
  );
  const matches = useMemo(() => {
    const query = programmeQuery.trim().toLowerCase();
    if (!query) return [];
    return programmeSuggestions.filter(
      ({ code, name }) =>
        code.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query),
    );
  }, [programmeQuery]);
  const canPreview = target === "all" || Boolean(programmeCode);
  const sourceUrl = programmeCode
    ? `https://programsandcourses.anu.edu.au/${year}/program/${programmeCode}`
    : null;

  function chooseProgramme(code: string) {
    setProgrammeQuery(code);
    setIsSearchOpen(false);
    setShowPreview(false);
  }

  return (
    <AppShell
      admin
      actions={
        <ButtonLink href="/admin/programmes" size="sm" variant="secondary">
          Imported programmes
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Import programmes
        </h1>

        <Card className="mt-7 overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-5 sm:px-7">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Choose what to import
            </h2>
          </div>

          <div className="space-y-7 p-5 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={target === "programme"}
                onClick={() => {
                  setTarget("programme");
                  setShowPreview(false);
                }}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  target === "programme"
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <span className="block text-sm font-semibold text-zinc-900">
                  One programme
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Search by programme code or name.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={target === "all"}
                onClick={() => {
                  setTarget("all");
                  setShowPreview(false);
                }}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  target === "all"
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <span className="block text-sm font-semibold text-zinc-900">
                  All programmes
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Import the full ANU catalogue year.
                </span>
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
              {target === "programme" ? (
                <div className="relative">
                  <Field label="Programme">
                    <div className="relative">
                      <Search
                        aria-hidden="true"
                        size={17}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                      />
                      <Input
                        aria-label="Programme to import"
                        className="pl-9"
                        placeholder="ALLB or Bachelor of Laws"
                        value={programmeQuery}
                        onFocus={() => setIsSearchOpen(true)}
                        onChange={(event) => {
                          setProgrammeQuery(event.target.value);
                          setIsSearchOpen(true);
                          setShowPreview(false);
                        }}
                      />
                    </div>
                  </Field>
                  {isSearchOpen && matches.length > 0 && (
                    <div
                      role="listbox"
                      aria-label="Matching programmes"
                      className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
                    >
                      {matches.map((programme) => (
                        <button
                          key={programme.code}
                          type="button"
                          role="option"
                          aria-selected={programme.code === programmeCode}
                          onClick={() => chooseProgramme(programme.code)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
                        >
                          <span className="min-w-0 truncate text-sm text-zinc-800">
                            {programme.name}
                          </span>
                          <span className="font-mono text-xs font-semibold text-zinc-500">
                            {programme.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-10 items-center rounded-lg bg-zinc-50 px-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                  Every ANU programme in {year}
                </div>
              )}

              <Field label="Catalogue year">
                <Select
                  aria-label="Catalogue year"
                  value={year}
                  onChange={(value) => {
                    setYear(value as (typeof years)[number]);
                    setShowPreview(false);
                  }}
                  options={years.map((item) => ({
                    value: item,
                    label: String(item),
                  }))}
                />
              </Field>
            </div>

            {target === "programme" && programmeCode && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-brand-500 pl-3 text-sm">
                <span className="font-mono font-semibold text-zinc-900">
                  {programmeCode}
                </span>
                <span className="text-zinc-600">
                  {selectedProgramme?.name ?? "Programme source to verify"}
                </span>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    View source <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">
                Include
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={includeOptions}
                    onChange={(event) => {
                      setIncludeOptions(event.target.checked);
                      setShowPreview(false);
                    }}
                    className="size-4 rounded border-zinc-300 text-brand-700 focus:ring-brand-500"
                  />
                  <span className="text-sm text-zinc-800">Study options</span>
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={includePrerequisites}
                    onChange={(event) => {
                      setIncludePrerequisites(event.target.checked);
                      setShowPreview(false);
                    }}
                    className="size-4 rounded border-zinc-300 text-brand-700 focus:ring-brand-500"
                  />
                  <span className="text-sm text-zinc-800">
                    Prerequisite courses
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-zinc-100 pt-5">
              <Button
                variant="primary"
                disabled={!canPreview}
                onClick={() => setShowPreview(true)}
              >
                Preview import
              </Button>
            </div>
          </div>
        </Card>

        {showPreview && (
          <Card className="mt-5" aria-live="polite">
            <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-7">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  {target === "all"
                    ? `All programmes for ${year}`
                    : `${programmeCode} for ${year}`}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {[
                    "Programme requirements",
                    includeOptions && "study options",
                    includePrerequisites && "prerequisite courses",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <Button
                disabled
                title="The programme importer has not been connected yet."
              >
                Import
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
