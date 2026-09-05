"use client";

import { Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@reui/ui/button";
import { Checkbox } from "@reui/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@reui/ui/sheet";
import {
  DEFAULT_METRIC_IDS,
  METRIC_OPTIONS,
  METRIC_ORDER,
  type MetricId,
} from "@/components/dashboard/metric-cards";

const STORAGE_KEY = "coursemap.dashboard.cards.v1";

function isMetricId(value: unknown): value is MetricId {
  return typeof value === "string" && value in METRIC_OPTIONS;
}

/**
 * The reader's chosen metric cards, persisted locally per browser. Cards
 * always render in the canonical registry order regardless of the order
 * they were picked in.
 */
export function useSelectedMetrics() {
  const [stored, setStored] = useState<MetricId[] | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setStored([...DEFAULT_METRIC_IDS]);
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.filter(isMetricId) : [];
      setStored(ids.length > 0 ? ids : [...DEFAULT_METRIC_IDS]);
    } catch {
      setStored([...DEFAULT_METRIC_IDS]);
    }
  }, []);

  const toggle = useCallback((id: MetricId) => {
    setStored((current) => {
      const base = current ?? [...DEFAULT_METRIC_IDS];
      const next = base.includes(id)
        ? base.filter((item) => item !== id)
        : METRIC_ORDER.filter((item) => base.includes(item) || item === id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    selected: stored ?? [...DEFAULT_METRIC_IDS],
    hydrated: stored !== null,
    toggle,
  };
}

export function CustomizeMetricsButton({
  selected,
  onToggle,
}: {
  selected: readonly MetricId[];
  onToggle: (id: MetricId) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 aria-hidden="true" />
          Customise
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Metric cards</SheetTitle>
          <SheetDescription>
            Pick the cards you want on your dashboard. Choices are saved on
            this device.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-6">
          {METRIC_ORDER.map((id) => {
            const option = METRIC_OPTIONS[id];
            const checked = selected.includes(id);
            return (
              <label
                key={id}
                className="hover:bg-muted/60 flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(id)}
                  aria-label={option.title}
                  className="mt-0.5"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{option.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {option.blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
