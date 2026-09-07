"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@coursemap/ui/primitives/dialog";
import { AppShell } from "@/ui/shell";
import { PreviewLayout } from "./preview-layout";
import { PreviewMarkEntry } from "./preview-mark-entry";
import {
  exampleCourses,
  resultLabel,
  type PreviewResult,
} from "./preview-data";

export function AcademicPreviews() {
  const [courses, setCourses] = useState(() => exampleCourses("results"));
  const [selection, setSelection] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  function record(code: string, result: PreviewResult) {
    setCourses((previous) =>
      previous.map((course) =>
        course.code === code ? { ...course, ...result } : course,
      ),
    );
    setMessage(
      `${code}: ${result.mark === undefined ? "" : `${result.mark}% · `}${resultLabel({ code, name: "", term: "", ...result })}. Saved in this preview only.`,
    );
    setSelection(null);
  }
  function act(code: string, action: "clear" | "remove") {
    setCourses((previous) =>
      action === "remove"
        ? previous.filter((course) => course.code !== code)
        : previous.map((course) =>
            course.code === code
              ? { ...course, mark: undefined, resultCode: undefined }
              : course,
          ),
    );
    setMessage(
      `${code}: ${action === "remove" ? "Course removed" : "Result cleared"} in this preview.`,
    );
  }
  return (
    <AppShell currentBreadcrumbLabel="Academic preview">
      <h1 className="sr-only">Academic record preview</h1>
      <PreviewLayout
        design="3"
        courses={courses}
        onSelect={setSelection}
        onAction={act}
      />
      <p
        role="status"
        aria-live="polite"
        className="mt-5 text-sm text-muted-foreground"
      >
        {message}
      </p>
      <Dialog
        open={selection !== null}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
      >
        {selection !== null ? (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {courses.find((course) => course.code === selection)?.name ??
                  "Record result"}
              </DialogTitle>
              <DialogDescription>{selection} · 6 units</DialogDescription>
            </DialogHeader>
            <PreviewMarkEntry
              key={selection}
              onCancel={() => setSelection(null)}
              onRecord={record}
              courses={courses.filter((course) => course.code === selection)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </AppShell>
  );
}
