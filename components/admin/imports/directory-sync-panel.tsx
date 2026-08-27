"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { readImportStream } from "@/components/admin/imports/import-stream";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { DirectorySyncTarget } from "@/lib/catalogue-import/run-directory-sync";

type DirectorySyncPanelProps = {
  catalogueYears: number[];
};

type CompleteResult = {
  runId?: string;
  target?: DirectorySyncTarget;
  counts?: {
    added: number;
    changed: number;
    checked: number;
    unchanged: number;
  };
};

/**
 * Operator control to refresh the lightweight ANU code-and-name directory for
 * a catalogue year. Full course and programme detail still imports elsewhere.
 */
export function DirectorySyncPanel({
  catalogueYears,
}: DirectorySyncPanelProps) {
  const router = useRouter();
  const defaultYear = catalogueYears[0] ?? 0;
  const [year, setYear] = useState(String(defaultYear));
  const [running, setRunning] = useState<DirectorySyncTarget | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);

  async function refresh(target: DirectorySyncTarget) {
    if (running) return;
    setRunning(target);
    setStatus(
      target === "courses"
        ? "Fetching course directory…"
        : "Fetching programme directory…",
    );
    setLastRunId(null);

    try {
      const response = await fetch("/api/admin/catalogue/imports/directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: Number(year),
          target,
        }),
      });

      const complete: { current: CompleteResult | null } = { current: null };
      await readImportStream(response, (event) => {
        if (event.type === "progress" && typeof event.message === "string") {
          setStatus(event.message);
        }
        if (event.type === "complete" && event.result) {
          complete.current = event.result as CompleteResult;
        }
      });

      const counts = complete.current?.counts;
      const runId =
        typeof complete.current?.runId === "string"
          ? complete.current.runId
          : null;
      setLastRunId(runId);
      if (counts) {
        const changed = counts.added + counts.changed;
        setStatus(
          changed > 0
            ? `${changed.toLocaleString("en-AU")} of ${counts.checked.toLocaleString("en-AU")} updated`
            : `${counts.checked.toLocaleString("en-AU")} checked, no change`,
        );
        toast.success(
          target === "courses"
            ? "Course directory refreshed"
            : "Programme directory refreshed",
        );
      } else {
        setStatus("Directory refresh finished");
      }
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Directory sync failed.";
      setStatus(message);
      toast.error(message);
    } finally {
      setRunning(null);
    }
  }

  const yearOptions = catalogueYears.map((value) => ({
    label: String(value),
    value: String(value),
  }));

  return (
    <section
      aria-label="Catalogue directory"
      className="space-y-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-4 shadow-xs"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-zinc-900">Refresh directory</h2>
        <p className="text-[13px] text-zinc-500">
          Pull every course or programme code and name for a year. Detail pages
          still import from Courses and Programmes.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-36" label="Catalogue year">
          <Select
            aria-label="Catalogue year"
            disabled={running !== null || yearOptions.length === 0}
            onChange={setYear}
            options={yearOptions}
            value={year}
          />
        </Field>
        <Button
          disabled={running !== null || yearOptions.length === 0}
          onClick={() => void refresh("courses")}
          variant="secondary"
        >
          {running === "courses" ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          {running === "courses" ? "Refreshing" : "Refresh courses"}
        </Button>
        <Button
          disabled={running !== null || yearOptions.length === 0}
          onClick={() => void refresh("programmes")}
          variant="secondary"
        >
          {running === "programmes" ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          {running === "programmes" ? "Refreshing" : "Refresh programmes"}
        </Button>
      </div>

      {status ? (
        <p aria-live="polite" className="text-[13px] text-zinc-600">
          {status}
          {lastRunId && !lastRunId.startsWith("demo-") ? (
            <>
              {" · "}
              <Link
                className="font-medium text-brand-700 hover:text-brand-800"
                href={`/admin/imports/sync/${lastRunId}`}
              >
                View run
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
