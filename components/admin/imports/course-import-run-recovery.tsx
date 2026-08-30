"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
          <Button size="sm">
            <RotateCcw aria-hidden="true" size={14} />
            Recover stalled work
          </Button>
        }
      />
      {message ? (
        <Alert tone={message.ok ? "success" : "danger"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
