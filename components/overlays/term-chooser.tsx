"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCoursemap } from "@/app/providers";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { Modal } from "@/components/ui/overlay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function TermChooser({
  course,
  onClose,
}: {
  course: Pick<CourseDetails, "code" | "name" | "sessions" | "year">;
  onClose: () => void;
}) {
  const { addCourse, notify } = useCoursemap();
  const [terms, setTerms] = useState<
    Array<{ id: string; year: number; name: string; dates: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTerms() {
      try {
        const response = await fetch("/api/plan/periods", {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          error?: string;
          terms?: Array<{
            id: string;
            year: number;
            name: string;
            dates: string;
          }>;
        };
        if (!response.ok || !payload.terms) {
          throw new Error(payload.error ?? "Semester options are unavailable.");
        }
        setTerms(payload.terms);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Semester options are unavailable.",
        );
      }
    }
    void loadTerms();
    return () => controller.abort();
  }, []);

  return (
    <Modal
      onClose={onClose}
      labelledBy="term-dialog-title"
      className="w-full max-w-md"
    >
      <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            {course.code}
          </p>
          <h2
            id="term-dialog-title"
            className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900"
          >
            Choose a semester
          </h2>
        </div>
        <IconButton label="Close semester chooser" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      <div className="max-h-[70vh] overflow-y-auto p-2">
        {error ? (
          <Alert tone="danger" role="alert" className="m-3 w-auto">
            <X />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : terms.length === 0 ? (
          <div className="space-y-2 p-2" aria-busy="true">
            <span className="sr-only">Loading available semesters</span>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg px-3 py-3"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          terms
            .filter(
              (term) => term.id === "unscheduled" || term.year === course.year,
            )
            .map((term) => {
              const unscheduled = term.id === "unscheduled";
              const available =
                unscheduled || course.sessions.includes(term.name);
              return (
                <Button
                  key={term.id}
                  variant="ghost"
                  fullWidth
                  onClick={async () => {
                    const result = await addCourse(
                      course.code,
                      term.id,
                      course.year,
                    );
                    notify(result.message, result.ok ? "success" : "warning");
                    if (result.ok) onClose();
                  }}
                  className="h-auto justify-start rounded-lg px-3 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-zinc-900">
                      {term.name}
                      {unscheduled ? "" : ` ${term.year}`}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {term.dates}
                    </span>
                  </span>
                  <Badge tone={available ? "success" : "neutral"}>
                    {unscheduled
                      ? "Choose later"
                      : available
                        ? "Offered"
                        : "Not listed"}
                  </Badge>
                  <ArrowRight size={16} className="text-zinc-300" />
                </Button>
              );
            })
        )}
      </div>
    </Modal>
  );
}
