"use client";

import { useState, useTransition } from "react";
import { Cpu } from "lucide-react";
import { toast } from "sonner";
import { setImportModel } from "@/lib/admin/settings-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Australia/Sydney",
});

/**
 * The model every course and structure import requests. Configured once here
 * rather than chosen per run, so two admins importing on the same day cannot
 * produce drafts from different models without noticing.
 */
export function ImportModelCard({
  canManage,
  configured,
  model,
  options,
  updatedAt,
}: {
  canManage: boolean;
  configured: boolean;
  model: string;
  options: string[];
  updatedAt: string | null;
}) {
  const [value, setValue] = useState(model);
  const [pending, startTransition] = useTransition();

  function choose(next: string) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setImportModel(next);
      if (result.ok) {
        toast.success(result.message);
        return;
      }
      setValue(previous);
      toast.error(result.message);
    });
  }

  return (
    <Card>
      <CardHeader
        description="Every queued course and academic structure import requests this model."
        icon={<Cpu aria-hidden="true" size={16} />}
        title="Import model"
      />
      <CardContent className="pb-5">
        <div className="max-w-sm">
          <Select
            aria-label="Import model"
            disabled={!canManage || pending || options.length === 0}
            onChange={choose}
            options={options.map((option) => ({
              label: option,
              value: option,
            }))}
            placeholder="No model configured"
            value={value}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {options.length === 0
            ? "Set COURSEMAP_OPENROUTER_MODELS to offer models here."
            : !canManage
              ? "Import management permission is required to change this."
              : configured && updatedAt
                ? `Last changed ${dateFormatter.format(new Date(updatedAt))}.`
                : "Using the first model this deployment allows."}
        </p>
      </CardContent>
    </Card>
  );
}
