"use client";
import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { ConfirmDialog } from "@/ui/ui/confirm-dialog";
import { recoverStalledCourseImportRun } from "@/lib/coursemap/course-import-review-actions";

export function CourseImportRunRecovery({ runId }: { runId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  async function recover() {
    const result = await recoverStalledCourseImportRun(runId);
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-2">
      <ConfirmDialog
        confirmLabel="Check stalled courses"
        description="Only courses with expired processing leases or no confirmed worker activity for at least 30 minutes are marked failed. Fresh dispatches and current workers are not interrupted."
        onConfirm={recover}
        title="Recover stalled import work?"
        trigger={
          <Button size="sm" variant="outline" type="button">
            <RotateCcw aria-hidden="true" size={14} />
            Recover stalled work
          </Button>
        }
      />
      {message ? (
        <Alert
          variant={
            (
              {
                neutral: "default",
                brand: "info",
                danger: "destructive",
                success: "success",
                warning: "warning",
              } as const
            )[message.ok ? "success" : "danger"]
          }
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
