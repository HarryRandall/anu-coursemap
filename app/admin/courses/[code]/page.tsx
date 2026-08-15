import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  GitBranch,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { courses } from "@/lib/catalogue";
import { parseTone } from "@/lib/ui";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const course = courses.find(
    (item) => item.code === code.trim().toUpperCase(),
  );

  if (!course) notFound();

  return (
    <AppShell
      admin
      actions={
        <a
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-xs ring-1 ring-zinc-200 transition ring-inset hover:bg-zinc-50 hover:ring-zinc-300"
        >
          ANU source <ExternalLink size={14} />
        </a>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <ButtonLink
          href="/admin/courses"
          variant="ghost"
          size="sm"
          className="-ml-2.5"
        >
          <ArrowLeft size={15} /> All courses
        </ButtonLink>

        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-brand-700">
                {course.code}
              </span>
              <Badge tone={parseTone(course.parseState)}>
                {course.parseState}
              </Badge>
              <span className="text-xs text-zinc-400">
                {course.year} catalogue version
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              {course.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              {course.description}
            </p>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-zinc-200 rounded-xl bg-white shadow-xs ring-1 ring-zinc-200">
            {[
              ["Units", String(course.units)],
              ["Level", String(course.level)],
              ["Sessions", String(course.sessions.length)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-20 px-4 py-3">
                <dt className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                  {label}
                </dt>
                <dd className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader
              title="Enrolment rules"
              description="The source text stays attached to the structured interpretation."
              icon={
                <span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <GitBranch size={16} />
                </span>
              }
            />
            <div className="border-t border-zinc-100 p-5">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                Prerequisite source text
              </p>
              <p className="mt-2 rounded-lg border-l-2 border-brand-400 bg-brand-50/60 px-3 py-2.5 text-sm leading-6 text-zinc-700">
                {course.prerequisiteText}
              </p>

              <div className="mt-5">
                <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                  Parsed course references
                </p>
                {course.prerequisiteCodes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {course.prerequisiteCodes.map((code) => {
                      const prerequisite = courses.find(
                        (item) => item.code === code,
                      );
                      return (
                        <Link
                          key={code}
                          href={`/admin/courses/${code}`}
                          className="rounded-lg bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-brand-200"
                        >
                          <span className="block font-mono text-[11px] font-semibold text-zinc-800">
                            {code}
                          </span>
                          {prerequisite && (
                            <span className="mt-0.5 block max-w-44 truncate text-[10px] text-zinc-500">
                              {prerequisite.name}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    No prerequisite course is required.
                  </p>
                )}
              </div>

              {course.incompatibilities.length > 0 && (
                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                    Incompatible courses
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    {course.incompatibilities.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader
                title="Course facts"
                icon={
                  <span className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-700">
                    <BookOpen size={16} />
                  </span>
                }
              />
              <dl className="divide-y divide-zinc-100 border-t border-zinc-100 text-sm">
                {[
                  ["School", course.school],
                  ["Convener", course.convener],
                  ["Delivery", course.delivery],
                  ["Sessions", course.sessions.join(" · ")],
                  ["Last source change", course.lastChanged],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-5 px-5 py-3"
                  >
                    <dt className="shrink-0 text-zinc-500">{label}</dt>
                    <dd className="text-right font-medium text-zinc-800">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card>
              <CardHeader
                title="Used by"
                description="Current mapped requirement groups."
                icon={
                  <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <GraduationCap size={16} />
                  </span>
                }
              />
              <div className="flex flex-wrap gap-2 border-t border-zinc-100 p-5">
                {course.countsTowards.map((requirement) => (
                  <span
                    key={requirement}
                    className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200"
                  >
                    {requirement}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-4 border-emerald-100 bg-emerald-50/40 shadow-none">
          <div className="flex gap-3 p-4">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-emerald-700"
              size={18}
            />
            <p className="text-sm leading-6 text-emerald-950/75">
              This admin record will show source snapshots, version diffs and
              reviewer decisions once the hosted importer is connected. Students
              will only see published catalogue versions.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
