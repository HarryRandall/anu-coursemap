"use client";

import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Preview = {
  programmes: number | null;
  coursePages: number;
  existingCourses: number;
  newCourses: number;
  isLowerBound: boolean;
  comparison: "database" | "demo";
};

export default function AdminSyncPreviewPage() {
  return (
    <Suspense
      fallback={
        <AppShell admin>
          <div className="w-full" />
        </AppShell>
      }
    >
      <SyncPreview />
    </Suspense>
  );
}

function SyncPreview() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "2026";
  const target = ["all", "all-courses", "courses"].includes(
    searchParams.get("target") ?? "",
  )
    ? (searchParams.get("target") as "all" | "all-courses" | "courses")
    : "selected";
  const programmes = searchParams.get("programmes") ?? "";
  const courses = searchParams.get("courses") ?? "";
  const editHref =
    target === "courses" || target === "all-courses"
      ? "/admin/sync/courses"
      : "/admin/sync";
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ year, target, programmes, courses });

    fetch(`/api/admin/catalogue/preview?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Preview & { error?: string };
        if (!response.ok)
          throw new Error(payload.error ?? "Preview unavailable.");
        setPreview(payload);
      })
      .catch((caughtError) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        )
          return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Preview unavailable.",
        );
      });

    return () => controller.abort();
  }, [courses, programmes, target, year]);

  return (
    <AppShell admin>
      <div className="w-full">
        <Link
          href={editHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} /> Edit sync
        </Link>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Review sync
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {target === "all"
            ? `All programmes from ${year}`
            : target === "all-courses"
              ? `All course pages from ${year}`
              : target === "courses"
                ? `${courses.split(",").length} selected course${courses.includes(",") ? "s" : ""} from ${year}`
                : `${programmes.split(",").length} selected programme${programmes.includes(",") ? "s" : ""} from ${year}`}
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-zinc-500">Course pages found</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {preview
                ? `${preview.isLowerBound ? "at least " : ""}${preview.coursePages}`
                : "…"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-zinc-500">Already in Coursemap</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {preview ? preview.existingCourses : "…"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-zinc-500">New course pages</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {preview ? preview.newCourses : "…"}
            </p>
          </Card>
        </div>

        {preview?.isLowerBound && (
          <p className="mt-4 text-sm text-zinc-500">
            The ANU search endpoint returns its first 500 course results. Full
            discovery runs before an all-programmes sync.
          </p>
        )}
        {preview?.comparison === "demo" && (
          <p className="mt-4 text-sm text-zinc-500">
            Local demo comparison against the catalogue bundled with this app.
          </p>
        )}
        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <CircleAlert size={16} /> {error}
          </div>
        )}

        <section className="mt-10 border-t border-zinc-200 pt-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            What will sync
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
            {target !== "courses" && target !== "all-courses" && (
              <p className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" /> Programme
                structures and rules
              </p>
            )}
            <p className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              {target === "courses" || target === "all-courses"
                ? "Course details and offerings"
                : "Required and elective course pages"}
            </p>
            {target !== "courses" && target !== "all-courses" && (
              <p className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" /> Study options
              </p>
            )}
            <p className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" /> Prerequisite
              relationships
            </p>
          </div>
        </section>

        <div className="mt-10 flex justify-end">
          <Button
            disabled
            title="The programme importer has not been connected yet."
          >
            <RefreshCw size={16} /> Sync now
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
