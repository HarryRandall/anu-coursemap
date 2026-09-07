"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@reui/ui/button";
import { Input } from "@reui/ui/input";
import type { CourseSnapshotProjectionData as Projection } from "@/lib/course-import/project-snapshot";

export function CourseUnitOptionsEditor({
  projection,
  onChange,
}: {
  projection: Projection;
  onChange: (projection: Projection) => void;
}) {
  function replace(options: Projection["unitOptions"]) {
    const units = options.map((option) => option.units);
    onChange({
      ...projection,
      unitOptions: options.map((option, index) => ({
        ...option,
        position: index + 1,
      })),
      snapshot: {
        ...projection.snapshot,
        ...(options.length
          ? {
              unitValueKind: "variable",
              units: null,
              minimumUnits: Math.min(...units),
              maximumUnits: Math.max(...units),
            }
          : { minimumUnits: null, maximumUnits: null }),
      },
    });
  }
  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <h3 className="text-sm font-semibold">Unit options</h3>
      {projection.unitOptions.map((option, index) => (
        <div className="flex items-end gap-3" key={option.position}>
          <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
            Units
            <Input
              required
              type="number"
              min="0.5"
              step="0.5"
              value={option.units}
              onChange={(event) =>
                replace(
                  projection.unitOptions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, units: Number(event.target.value) }
                      : item,
                  ),
                )
              }
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
            Label
            <Input
              value={option.label ?? ""}
              onChange={(event) =>
                replace(
                  projection.unitOptions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, label: event.target.value || null }
                      : item,
                  ),
                )
              }
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Remove unit option ${index + 1}`}
            onClick={() =>
              replace(
                projection.unitOptions.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              )
            }
          >
            <Trash2 size={15} aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          replace([
            ...projection.unitOptions,
            {
              position: projection.unitOptions.length + 1,
              units: 6,
              label: null,
              sourceText: "6 units",
            },
          ])
        }
      >
        <Plus size={14} aria-hidden="true" />
        Add unit option
      </Button>
    </div>
  );
}
