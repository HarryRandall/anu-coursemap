"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ImportFormShell } from "@/components/admin/imports/import-form-shell";
import {
  ImportRunStatus,
  type ImportProgressEvent,
} from "@/components/admin/imports/import-run-status";
import { readImportStream } from "@/components/admin/imports/import-stream";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

const PROGRAMME_CODE_PATTERN = /^[A-Z0-9-]{4,}$/u;

export function ProgrammeImport({
  catalogueYears,
}: {
  catalogueYears: number[];
}) {
  const router = useRouter();
  const defaultYear = catalogueYears[0] ?? new Date().getFullYear();
  const [year, setYear] = useState(defaultYear);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [current, setCurrent] = useState<ImportProgressEvent | null>(null);
  const [log, setLog] = useState<ImportProgressEvent[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [courseTotal, setCourseTotal] = useState(0);

  const normalisedCode = code.trim().toUpperCase();
  const valid = PROGRAMME_CODE_PATTERN.test(normalisedCode);

  async function runImport() {
    if (running) return;
    setError(null);
    if (!valid) {
      setError("Enter a programme code, for example BCOMP.");
      return;
    }

    setRunning(true);
    setDone(false);
    setRunId(null);
    setLog([]);
    setCourseTotal(0);
    setCurrent({
      code: normalisedCode,
      kind: "programme",
      message: "Reading programme page",
    });

    try {
      const response = await fetch("/api/admin/catalogue/imports/programmes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: year,
          programmeCodes: [normalisedCode],
        }),
      });

      await readImportStream(response, (event) => {
        if (event.type === "progress") {
          const progress: ImportProgressEvent = {
            action: typeof event.action === "string" ? event.action : undefined,
            code: typeof event.code === "string" ? event.code : undefined,
            index: typeof event.index === "number" ? event.index : undefined,
            kind: event.kind === "course" ? "course" : "programme",
            message:
              typeof event.message === "string" ? event.message : undefined,
            total: typeof event.total === "number" ? event.total : undefined,
          };
          if (typeof progress.total === "number") {
            setCourseTotal(progress.total);
          }
          setCurrent(progress);
          setLog((entries) => [...entries, progress].slice(-16));
          return;
        }
        if (event.type === "complete") {
          const result = event.result as
            | { programme?: { runId?: string } }
            | undefined;
          if (typeof result?.programme?.runId === "string") {
            setRunId(result.programme.runId);
          }
        }
      });

      setDone(true);
      toast.success(`Imported ${normalisedCode}.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
      setCurrent(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <ImportFormShell
      title="Import programmes"
      progress={
        running || done ? (
          <ImportRunStatus
            current={current}
            done={done}
            headline={current?.code ?? normalisedCode}
            log={log}
            runHref={
              runId ? `/admin/imports/sync/${runId}` : "/admin/imports/sync"
            }
            successLabel={`Imported ${normalisedCode}${
              courseTotal > 0
                ? ` and ${courseTotal} ${courseTotal === 1 ? "course" : "courses"}`
                : ""
            }`}
          />
        ) : null
      }
      footer={
        <>
          <ButtonLink href="/admin/imports/sync" variant="secondary">
            {done ? "Back to sync" : "Cancel"}
          </ButtonLink>
          <Button
            aria-busy={running}
            disabled={running || !valid}
            onClick={() => void runImport()}
            variant="primary"
          >
            {running ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : null}
            {running ? "Importing" : "Import programme"}
          </Button>
        </>
      }
    >
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
        <Field label="Programme code">
          <Input
            autoComplete="off"
            className="font-mono"
            disabled={running}
            onChange={(event) => {
              setCode(event.target.value);
              setDone(false);
              setRunId(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void runImport();
            }}
            placeholder="e.g. BCOMP"
            value={code}
          />
        </Field>
        <Field label="Catalogue year">
          <Select
            aria-label="Catalogue year"
            disabled={running}
            onChange={setYear}
            options={catalogueYears.map((value) => ({
              label: String(value),
              value,
            }))}
            value={year}
          />
        </Field>
      </div>
    </ImportFormShell>
  );
}
