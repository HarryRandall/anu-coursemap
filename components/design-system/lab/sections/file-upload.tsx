"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUpload } from "@uui/components/application/file-upload/file-upload-base";
import { Button } from "@uui/components/base/buttons/button";
import { Example, Stack } from "../section-frame";

type Upload = {
  id: string;
  name: string;
  size: number;
  progress: number;
  failed: boolean;
};

const SEED: Upload[] = [
  {
    id: "transcript",
    name: "anu-transcript-2026.pdf",
    size: 284_000,
    progress: 100,
    failed: false,
  },
  {
    id: "plan",
    name: "advanced-computing-plan.csv",
    size: 18_400,
    progress: 62,
    failed: false,
  },
  {
    id: "handbook",
    name: "handbook-extract.docx",
    size: 1_240_000,
    progress: 34,
    failed: true,
  },
];

function useSimulatedUploads(initial: Upload[]) {
  const [uploads, setUploads] = useState<Upload[]>(initial);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setUploads((current) =>
        current.map((upload) =>
          upload.failed || upload.progress >= 100
            ? upload
            : { ...upload, progress: Math.min(100, upload.progress + 6) },
        ),
      );
    }, 400);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const add = useCallback((files: FileList) => {
    setUploads((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
        progress: 0,
        failed: false,
      })),
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setUploads((current) => current.filter((upload) => upload.id !== id));
  }, []);

  const retry = useCallback((id: string) => {
    setUploads((current) =>
      current.map((upload) =>
        upload.id === id ? { ...upload, failed: false, progress: 0 } : upload,
      ),
    );
  }, []);

  return { uploads, add, remove, retry, setUploads };
}

function UploadQueue() {
  const { uploads, add, remove, retry, setUploads } = useSimulatedUploads(SEED);

  return (
    <div className="flex flex-col gap-5">
      <FileUpload.Root>
        <FileUpload.DropZone
          hint="PDF, DOCX or CSV up to 10MB"
          accept=".pdf,.docx,.csv"
          allowsMultiple
          onDropFiles={add}
        />

        <FileUpload.List>
          {uploads.map((upload) => (
            <FileUpload.ListItemProgressBar
              key={upload.id}
              name={upload.name}
              size={upload.size}
              progress={upload.progress}
              failed={upload.failed}
              onDelete={() => remove(upload.id)}
              onRetry={() => retry(upload.id)}
            />
          ))}
        </FileUpload.List>
      </FileUpload.Root>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" color="secondary" onClick={() => setUploads(SEED)}>
          Reset queue
        </Button>
        <Button size="sm" color="secondary" onClick={() => setUploads([])}>
          Clear all
        </Button>
        <p className="text-tertiary text-sm">
          {uploads.length === 0
            ? "Nothing queued. Drop a file on the zone above, or browse for one."
            : `${uploads.filter((u) => u.progress === 100 && !u.failed).length} of ${uploads.length} complete.`}
        </p>
      </div>
    </div>
  );
}

export function FileUploadSection() {
  return (
    <Stack>
      <Example
        title="Dropzone with a live queue"
        description="Drag a file onto the zone, or use Browse. Uploads advance on a timer; the failed row can be retried and any row can be deleted."
      >
        <UploadQueue />
      </Example>

      <Example
        title="Empty dropzone"
        description="The resting state, with the accepted formats spelled out."
      >
        <FileUpload.Root>
          <FileUpload.DropZone
            hint="PDF or CSV up to 10MB"
            accept=".pdf,.csv"
          />
        </FileUpload.Root>
      </Example>

      <Example
        title="Disabled"
        description="Locked while an import is already running."
      >
        <FileUpload.Root>
          <FileUpload.DropZone
            isDisabled
            hint="Available once the current import finishes"
          />
        </FileUpload.Root>
      </Example>
    </Stack>
  );
}
