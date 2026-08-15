import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  Layers3,
  ListTree,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { courses, degrees, majors } from "@/lib/catalogue";

type StructureRecord = {
  code: string;
  name: string;
  kind: "Degree" | "Major" | "Minor" | "Specialisation";
  units: number;
  description: string;
  sourceUrl: string;
  courseCodes: string[];
  requirements: Array<{
    title: string;
    description: string;
    state: "Mapped" | "Review";
  }>;
};

const sourceUrlForDegree = (code: string) =>
  `https://programsandcourses.anu.edu.au/2026/program/${code}`;

function recordFor(code: string): StructureRecord | undefined {
  const degree = degrees.find((item) => item.code === code);
  if (degree) {
    return {
      ...degree,
      kind: "Degree",
      sourceUrl: sourceUrlForDegree(degree.code),
      courseCodes: [
        "COMP1100",
        "MATH1005",
        "COMP1110",
        "COMP1600",
        "COMP2100",
        "COMP2300",
        "COMP2400",
      ],
      requirements: [
        {
          title: "Compulsory study",
          description: "Explicit courses and approved alternatives.",
          state: "Mapped",
        },
        {
          title: "Study options",
          description: "Linked majors, minors and specialisations.",
          state: "Mapped",
        },
        {
          title: "Subject and elective rules",
          description:
            "Unit-based requirements retained as rules, not course lists.",
          state: "Review",
        },
      ],
    };
  }

  const major = majors.find((item) => item.code === code);
  if (major) {
    return {
      ...major,
      kind: "Major",
      sourceUrl: `https://programsandcourses.anu.edu.au/2026/major/${major.code}`,
      requirements: [
        {
          title: "Required courses",
          description: "Named course requirements in the major.",
          state: "Mapped",
        },
        {
          title: "Choice groups",
          description: "Alternatives and unit-based options kept in order.",
          state: "Review",
        },
      ],
    };
  }

  const additional = {
    "CYBR-MIN": {
      name: "Cyber Security",
      kind: "Minor" as const,
      units: 24,
      description: "A focused Cyber Security study option.",
      sourceUrl: "https://programsandcourses.anu.edu.au/2026/minor/CYBR-MIN",
      courseCodes: ["COMP2300", "COMP2310"],
    },
    "HCI-SPEC": {
      name: "Human-Centred Computing",
      kind: "Specialisation" as const,
      units: 24,
      description: "A focused Human-Centred Computing study option.",
      sourceUrl:
        "https://programsandcourses.anu.edu.au/2026/specialisation/HCI-SPEC",
      courseCodes: ["COMP2100", "COMP2120"],
    },
  }[code];

  return additional
    ? {
        code,
        ...additional,
        requirements: [
          {
            title: "Requirement structure",
            description: "Course and choice rules will be imported together.",
            state: "Review",
          },
        ],
      }
    : undefined;
}

export default async function AdminProgrammeDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const record = recordFor(code.trim().toUpperCase());
  if (!record) notFound();
  const linkedCourses = record.courseCodes
    .map((courseCode) => courses.find((course) => course.code === courseCode))
    .filter((course): course is (typeof courses)[number] => Boolean(course));
  const studyOptions = record.kind === "Degree" ? majors : [];

  return (
    <AppShell
      admin
      actions={
        <ButtonLink href="/admin/sync" size="sm">
          Plan import
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <ButtonLink
          href="/admin/programmes"
          variant="ghost"
          size="sm"
          className="-ml-2.5"
        >
          <ArrowLeft size={15} /> All programmes
        </ButtonLink>

        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{record.kind}</Badge>
              <span className="font-mono text-sm font-semibold text-brand-700">
                {record.code}
              </span>
              <span className="text-xs text-zinc-400">
                2026 catalogue version
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              {record.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              {record.description}
            </p>
          </div>
          <a
            href={record.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-zinc-700 shadow-xs ring-1 ring-zinc-200 transition ring-inset hover:bg-zinc-50 hover:ring-zinc-300"
          >
            Open ANU source <ExternalLink size={14} />
          </a>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total units", String(record.units)],
            ["Course references", String(linkedCourses.length)],
            ["Study options", String(studyOptions.length)],
            [
              "Review items",
              String(
                record.requirements.filter((item) => item.state === "Review")
                  .length,
              ),
            ],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
                {value}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader
              title="Requirement map"
              description="The programme's rule structure, in the order a reviewer needs to inspect it."
              icon={
                <span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <ListTree size={16} />
                </span>
              }
            />
            <div className="divide-y divide-zinc-100 border-t border-zinc-100">
              {record.requirements.map((requirement, index) => (
                <div key={requirement.title} className="flex gap-3 px-5 py-4">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-900">
                        {requirement.title}
                      </p>
                      <Badge
                        tone={
                          requirement.state === "Mapped" ? "success" : "warning"
                        }
                      >
                        {requirement.state}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {requirement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Referenced courses"
              description="Direct course pages are visible before an import runs."
              icon={
                <span className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-700">
                  <BookOpen size={16} />
                </span>
              }
            />
            <div className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100">
              {linkedCourses.length > 0 ? (
                linkedCourses.map((course) => (
                  <Link
                    key={course.code}
                    href={`/admin/courses/${course.code}`}
                    className="group flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-zinc-800 group-hover:text-brand-700">
                        {course.code}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">
                        {course.name}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-zinc-400">
                      {course.units}u
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-zinc-500">
                  No local course preview is available yet.
                </p>
              )}
            </div>
          </Card>
        </div>

        {studyOptions.length > 0 && (
          <Card className="mt-4">
            <CardHeader
              title="Linked study options"
              description="These are separate versioned structures, not flat degree fields."
              icon={
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Layers3 size={16} />
                </span>
              }
            />
            <div className="grid border-t border-zinc-100 sm:grid-cols-2 lg:grid-cols-3">
              {studyOptions.map((option) => (
                <Link
                  key={option.code}
                  href={`/admin/programmes/${option.code}`}
                  className="group border-r border-b border-zinc-100 p-4 transition hover:bg-zinc-50"
                >
                  <span className="block font-mono text-xs font-semibold text-zinc-800 group-hover:text-brand-700">
                    {option.code}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-zinc-700">
                    {option.name}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {option.units} units
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <Card className="mt-4 border-brand-100 bg-brand-50/40 shadow-none">
          <div className="flex gap-3 p-4">
            <FileText className="mt-0.5 shrink-0 text-brand-700" size={18} />
            <p className="text-brand-950/75 text-sm leading-6">
              Source snapshots and content hashes will appear here with the
              import run that created this version. Publication remains separate
              from parsing and reviewer acceptance.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
