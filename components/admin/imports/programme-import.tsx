"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

const PROGRAMME_CODE_PATTERN = /^[A-Z0-9-]{4,}$/u;

/**
 * A programme pull streams a page at a time, because it walks every course the
 * programme references and that can be eighty requests.
 */
async function readProgrammeImport(
  response: Response,
  onProgress: (pages: number) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  let pages = 0;

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const event = JSON.parse(line.slice(5).trim()) as {
        type?: string;
        message?: string;
      };
      if (event.type === "progress") {
        pages += 1;
        onProgress(pages);
      }
      if (event.type === "error") {
        throw new Error(event.message ?? "Programme import failed.");
      }
    }
    if (done) return;
  }
}

export function ProgrammeImport({
  catalogueYears,
}: {
  catalogueYears: number[];
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(
    catalogueYears.includes(currentYear)
      ? currentYear
      : (catalogueYears[0] ?? currentYear),
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

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
    setProgress("Reading programme page");
    try {
      const response = await fetch("/api/admin/catalogue/imports/programmes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: year,
          programmeCodes: [normalisedCode],
        }),
      });
      if (!response.ok) throw new Error("Programme import failed.");
      await readProgrammeImport(response, (pages) =>
        setProgress(`Read ${pages} ${pages === 1 ? "page" : "pages"}`),
      );

      toast.success(`Imported ${normalisedCode}.`);
      router.push("/admin/imports/sync");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-10">
      <h1 className="sr-only">Import programmes</h1>

      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/*
        No search here: programmes are not held in a list an operator picks
        from, and one code pulls the whole structure with every course it
        references.
      */}
      <Field
        hint="Pulls the programme structure and every course it references."
        label="Programme code"
      >
        <Input
          autoComplete="off"
          className="font-mono"
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void runImport();
          }}
          placeholder="e.g. BCOMP"
          value={code}
        />
      </Field>

      <Field className="max-w-[200px]" label="Catalogue year">
        <Select
          aria-label="Catalogue year"
          onChange={setYear}
          options={catalogueYears.map((value) => ({
            label: String(value),
            value,
          }))}
          value={year}
        />
      </Field>

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
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
        <ButtonLink href="/admin/imports/sync" variant="ghost">
          Cancel
        </ButtonLink>
        {progress ? (
          <span
            aria-live="polite"
            className="text-[13px] text-zinc-500 tabular-nums"
          >
            {progress}
          </span>
        ) : null}
      </div>
    </div>
  );
}
