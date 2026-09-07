"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@coursemap/ui/primitives/card";
import { OptionPicker } from "@/ui/ui/option-picker";

import { useState, useTransition } from "react";
import { Cpu } from "lucide-react";
import { toast } from "sonner";
import { setImportModel } from "@/lib/admin/settings-actions";

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
      <CardHeader>
        {<Cpu aria-hidden="true" size={16} />}
        <CardTitle>
          <h2>{"Import model"}</h2>
        </CardTitle>
        {Boolean(
          "Every queued course and academic structure import requests this model.",
        ) && (
          <CardDescription>
            {
              "Every queued course and academic structure import requests this model."
            }
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        <div className="max-w-sm">
          <OptionPicker
            value={"coursemap:" + String(value)}
            onValueChange={(nextValue) => {
              const option = options
                .map((option) => ({
                  label: option,
                  value: option,
                }))
                .find(
                  (option) => "coursemap:" + String(option.value) === nextValue,
                );
              if (option) choose(option.value);
            }}
            disabled={!canManage || pending || options.length === 0}
            aria-label={"Import model"}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder={"No model configured"}
            items={options
              .map((option) => ({
                label: option,
                value: option,
              }))
              .map((option) => ({
                value: "coursemap:" + String(option.value),
                label: option.label,
              }))}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
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
