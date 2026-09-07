"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@coursemap/ui/primitives/button";

export function StopStructureImport({ runId }: { runId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function stop() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/academic-structure-imports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      if (!response.ok)
        throw new Error("The import run could not be stopped. Try again.");
      router.refresh();
    } catch {
      setError("The import run could not be stopped. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void stop()}
      >
        {pending ? "Stopping..." : "Stop run"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
