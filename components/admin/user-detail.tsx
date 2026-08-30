"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  History,
  IdCard,
  ListChecks,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { UserRoleEditor } from "@/components/admin/user-role-editor";
import { TermLoadChart } from "@/components/dashboard/term-load-chart";
import { DegreeProgressBar } from "@/components/plan/degree-progress-bar";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { StatTile } from "@/components/ui/stat-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminUserStudyProgress,
  adminUserTermLoads,
  uniqueTrackedCourseCount,
} from "@/lib/admin/user-study";
import type {
  AdminUserCourseStatus,
  AdminUserDetailData,
} from "@/lib/admin/users";
import type { Tone } from "@/lib/ui";

const userTabs = ["overview", "courses", "access"] as const;
type UserTab = (typeof userTabs)[number];

function tabFromSearch(value: string | null): UserTab {
  return userTabs.includes(value as UserTab) ? (value as UserTab) : "overview";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatStudyLoad(value: "full_time" | "part_time") {
  return value === "part_time" ? "Part time" : "Full time";
}

function formatTerm({
  calendarYear,
  periodName,
  periodCode,
}: {
  calendarYear: number | null;
  periodName: string | null;
  periodCode: string | null;
}) {
  if (calendarYear === null || periodCode === null) return "Not scheduled";
  return (periodName ?? periodCode) + " " + calendarYear;
}

function courseStatus(status: AdminUserCourseStatus): {
  label: string;
  tone: Tone;
} {
  return {
    planned: { label: "Planned", tone: "info" },
    enrolled: { label: "In progress", tone: "brand" },
    completed: { label: "Completed", tone: "success" },
    credited: { label: "Credit", tone: "success" },
    failed: { label: "Failed", tone: "danger" },
    withdrawn: { label: "Withdrawn", tone: "neutral" },
  }[status] as { label: string; tone: Tone };
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start sm:gap-4">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd
        className={
          mono
            ? "min-w-0 font-mono text-xs break-all text-zinc-700"
            : "min-w-0 text-sm text-zinc-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function AdminUserDetail({
  data,
  currentUserId,
}: {
  data: AdminUserDetailData;
  currentUserId: string;
}) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<UserTab>(() =>
    tabFromSearch(searchParams.get("tab")),
  );
  const assignedRoleKeys = new Set(
    data.assignments.map((assignment) => assignment.roleKey),
  );
  const assignedRole = data.roles.find((role) =>
    assignedRoleKeys.has(role.key),
  );
  const assignment = data.assignments[0];
  const isAdministrator = assignedRole?.key === "admin";
  const programme = data.study.structures.find(
    (structure) => structure.role === "programme",
  );
  const major = data.study.structures.find(
    (structure) => structure.role === "major",
  );
  const minors = data.study.structures.filter(
    (structure) => structure.role === "minor",
  );
  const specialisations = data.study.structures.filter(
    (structure) => structure.role === "specialisation",
  );
  const progress = useMemo(
    () => adminUserStudyProgress(data.study),
    [data.study],
  );
  const termLoads = useMemo(
    () => adminUserTermLoads(data.study.courses),
    [data.study.courses],
  );
  const trackedCourses = uniqueTrackedCourseCount(data.study.courses);
  const completedCourses = data.study.courses.filter(
    (course) => course.status === "completed" || course.status === "credited",
  ).length;
  const activeCourses = data.study.courses.filter(
    (course) => course.status === "planned" || course.status === "enrolled",
  ).length;
  const milestones = [
    {
      label: "Account created",
      date: data.user.createdAt,
      detail: "Coursemap profile created",
    },
    ...(data.user.updatedAt !== data.user.createdAt
      ? [
          {
            label: "Profile updated",
            date: data.user.updatedAt,
            detail: "Name or study identity changed",
          },
        ]
      : []),
    ...(data.study.plan
      ? [
          {
            label: "Primary plan created",
            date: data.study.plan.createdAt,
            detail: data.study.plan.catalogueYear + " catalogue",
          },
          ...(data.study.plan.updatedAt !== data.study.plan.createdAt
            ? [
                {
                  label: "Plan updated",
                  date: data.study.plan.updatedAt,
                  detail: "Latest saved plan change",
                },
              ]
            : []),
        ]
      : []),
  ].toSorted(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime(),
  );

  useEffect(() => {
    const syncTabFromHistory = () => {
      setActiveTab(
        tabFromSearch(new URL(window.location.href).searchParams.get("tab")),
      );
    };
    window.addEventListener("popstate", syncTabFromHistory);
    return () => window.removeEventListener("popstate", syncTabFromHistory);
  }, []);

  const selectTab = (tab: UserTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.pathname + url.search + url.hash);
  };

  const tabs = (
    <TabsList className="h-auto min-w-max justify-start gap-0 rounded-none bg-transparent p-0">
      {[
        { value: "overview", label: "Overview", icon: UserRound },
        { value: "courses", label: "Courses", icon: BookOpen },
        { value: "access", label: "Access", icon: ShieldCheck },
      ].map(({ value, label, icon: Icon }) => (
        <TabsTrigger
          className="h-12 rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 text-sm text-zinc-500 shadow-none hover:text-zinc-950 data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:text-zinc-950 data-[state=active]:shadow-none"
          key={value}
          value={value}
        >
          <Icon aria-hidden="true" size={15} />
          {label}
          {value === "courses" && trackedCourses > 0 ? (
            <span className="ml-0.5 text-[11px] text-zinc-400 tabular-nums">
              {trackedCourses}
            </span>
          ) : null}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <Tabs
      className="block"
      onValueChange={(value) => selectTab(value as UserTab)}
      value={activeTab}
    >
      <AppShell
        admin
        currentBreadcrumbLabel={data.user.displayName}
        tabs={tabs}
      >
        <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 pb-10">
          <Card className="overflow-hidden">
            <div className="flex min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <GeneratedAvatar
                  name={data.user.displayName}
                  email={data.user.email}
                  className="size-14 text-sm"
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {/*
                      The breadcrumb already ends in this name, so it is here
                      as the label for the avatar beside it, not as a page
                      title. At display size it was the largest type in the
                      console and read as one.
                    */}
                    <h1 className="min-w-0 text-base font-semibold break-words text-zinc-950">
                      {data.user.displayName}
                    </h1>
                    {data.user.userId === currentUserId ? (
                      <Badge tone="brand">You</Badge>
                    ) : null}
                    <Badge tone={isAdministrator ? "success" : "neutral"}>
                      {assignedRole?.name ?? "User"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm break-all text-zinc-500">
                    {data.user.email ?? "No email address"}
                  </p>
                </div>
              </div>
              <Badge
                className="self-start sm:self-auto"
                tone={data.study.plan ? "success" : "warning"}
              >
                {data.study.plan ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <Clock3 aria-hidden="true" />
                )}
                {data.study.plan
                  ? "Onboarding complete"
                  : "Onboarding incomplete"}
              </Badge>
            </div>
            <div className="grid border-t border-zinc-200/80 bg-zinc-50/50 sm:grid-cols-3 sm:divide-x sm:divide-zinc-200/80">
              {[
                {
                  icon: CalendarDays,
                  label: "Joined",
                  value: formatDate(data.user.createdAt),
                },
                {
                  icon: IdCard,
                  label: "Student number",
                  value: data.user.studentNumber ?? "Not supplied",
                },
                {
                  icon: Clock3,
                  label: "Last record change",
                  value: formatDate(
                    data.study.plan?.updatedAt ?? data.user.updatedAt,
                  ),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  className="flex items-center gap-3 border-b border-zinc-200/80 px-5 py-3 last:border-b-0 sm:border-b-0"
                  key={label}
                >
                  <Icon
                    aria-hidden="true"
                    className="shrink-0 text-zinc-400"
                    size={15}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                      {label}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-zinc-700">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <TabsContent className="mt-0 space-y-5" value="overview">
            {data.study.plan && programme ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatTile
                    description={
                      progress.completed +
                      " of " +
                      progress.total +
                      " units completed"
                    }
                    icon={<GraduationCap aria-hidden="true" />}
                    label="Degree progress"
                    unit="%"
                    value={progress.percent}
                  />
                  <StatTile
                    description={
                      completedCourses +
                      " completed or credited, " +
                      activeCourses +
                      " active"
                    }
                    icon={<BookOpen aria-hidden="true" />}
                    label="Courses tracked"
                    value={trackedCourses}
                  />
                  <StatTile
                    description={progress.remaining + " units still to map"}
                    icon={<ListChecks aria-hidden="true" />}
                    label="Plan coverage"
                    unit="units"
                    value={progress.mapped}
                  />
                  <StatTile
                    description="Most recent primary-plan change"
                    icon={<Clock3 aria-hidden="true" />}
                    label="Plan updated"
                    value={formatDate(data.study.plan.updatedAt)}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>Degree progress</CardTitle>
                        <CardDescription>
                          {programme.name} ({programme.code})
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-3xl font-semibold tracking-tight text-zinc-950 tabular-nums">
                        {progress.percent}% complete
                      </p>
                      <DegreeProgressBar compact progress={progress} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader title="Study details" />
                    <CardContent>
                      <dl>
                        <DetailRow
                          label="Programme"
                          value={programme.name + " (" + programme.code + ")"}
                        />
                        <DetailRow
                          label="Major"
                          value={
                            major
                              ? major.name + " (" + major.code + ")"
                              : "None selected"
                          }
                        />
                        <DetailRow
                          label="Minors"
                          value={
                            minors.length > 0
                              ? minors
                                  .map(
                                    (minor) =>
                                      minor.name + " (" + minor.code + ")",
                                  )
                                  .join(", ")
                              : "None selected"
                          }
                        />
                        <DetailRow
                          label="Specialisations"
                          value={
                            specialisations.length > 0
                              ? specialisations
                                  .map(
                                    (specialisation) =>
                                      specialisation.name +
                                      " (" +
                                      specialisation.code +
                                      ")",
                                  )
                                  .join(", ")
                              : "None selected"
                          }
                        />
                        <DetailRow
                          label="Catalogue"
                          value={data.study.plan.catalogueYear}
                        />
                        <DetailRow
                          label="Commencement"
                          value={data.study.plan.commencementYear}
                        />
                        <DetailRow
                          label="Study load"
                          value={formatStudyLoad(data.study.plan.studyLoad)}
                        />
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
                  <TermLoadChart terms={termLoads} />

                  <Card>
                    <CardHeader
                      icon={
                        <History
                          aria-hidden="true"
                          className="mt-0.5 text-brand-600"
                          size={17}
                        />
                      }
                      title="Record milestones"
                    />
                    <CardContent>
                      <ol className="space-y-0">
                        {milestones.map((milestone, index) => (
                          <li
                            className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                            key={milestone.label + "-" + milestone.date}
                          >
                            {index < milestones.length - 1 ? (
                              <span
                                aria-hidden="true"
                                className="absolute top-4 bottom-0 left-[5px] w-px bg-zinc-200"
                              />
                            ) : null}
                            <span className="relative mt-1 size-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-900">
                                {milestone.label}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-500">
                                {milestone.detail}
                              </p>
                              <time
                                className="mt-1 block text-[10px] text-zinc-400 tabular-nums"
                                dateTime={milestone.date}
                              >
                                {formatDate(milestone.date)}
                              </time>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <Empty className="min-h-72">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GraduationCap aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Onboarding has not been completed</EmptyTitle>
                    <EmptyDescription>
                      This account does not have a primary degree plan yet.
                      Access settings are still available in the Access tab.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </Card>
            )}
          </TabsContent>

          <TabsContent className="mt-0" value="courses">
            <DataTableShell
              footer={
                <p className="text-xs text-zinc-500 tabular-nums">
                  {trackedCourses.toLocaleString("en-AU")} unique{" "}
                  {trackedCourses === 1 ? "course" : "courses"}
                </p>
              }
            >
              <Table className="min-w-[780px] table-fixed">
                <TableCaption>
                  Planned courses and recorded course attempts
                </TableCaption>
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[15%]" />
                  <col className="w-[22%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Study period</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Mark</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.study.courses.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="p-0" colSpan={6}>
                        <DataTableEmpty
                          description="Courses will appear after this user begins building their plan or records study history."
                          icon={<BookOpen aria-hidden="true" />}
                          title="No courses recorded"
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {data.study.courses.map((course) => {
                    const status = courseStatus(course.status);
                    return (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 font-mono text-[10px] font-bold text-brand-700">
                              {course.code.slice(0, 2)}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-mono text-xs font-semibold text-zinc-950">
                                {course.code}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                                {course.title}
                              </span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600">
                          {formatTerm(course)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-600 tabular-nums">
                          {course.units}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-600 tabular-nums">
                          {course.mark ?? "Not recorded"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500 tabular-nums">
                          {formatDate(course.updatedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          </TabsContent>

          <TabsContent className="mt-0" value="access">
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
              <UserRoleEditor
                assignments={data.assignments}
                currentUserId={currentUserId}
                permissions={data.permissions}
                roles={data.roles}
                user={data.user}
              />

              <div className="space-y-5">
                <Card>
                  <CardHeader title="Account details" />
                  <CardContent>
                    <dl>
                      <DetailRow
                        label="Email"
                        value={data.user.email ?? "Not supplied"}
                      />
                      <DetailRow
                        label="Student number"
                        value={data.user.studentNumber ?? "Not supplied"}
                      />
                      <DetailRow
                        label="User ID"
                        mono
                        value={data.user.userId}
                      />
                      <DetailRow
                        label="Joined"
                        value={formatDate(data.user.createdAt)}
                      />
                      <DetailRow
                        label="Profile updated"
                        value={formatDate(data.user.updatedAt)}
                      />
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader title="Role assignment" />
                  <CardContent>
                    <dl>
                      <DetailRow
                        label="Current role"
                        value={assignedRole?.name ?? "User"}
                      />
                      <DetailRow
                        label="Assigned by"
                        value={
                          assignment?.grantedByDisplayName ?? "System default"
                        }
                      />
                      <DetailRow
                        label="Assigned on"
                        value={
                          assignment?.grantedAt
                            ? formatDate(assignment.grantedAt)
                            : "Not recorded"
                        }
                      />
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </div>
      </AppShell>
    </Tabs>
  );
}
