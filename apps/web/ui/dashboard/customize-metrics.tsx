"use client";

import { Settings2 } from "lucide-react";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Button } from "@coursemap/ui/primitives/button";
import { Checkbox } from "@coursemap/ui/primitives/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@coursemap/ui/primitives/sheet";
import {
  DEFAULT_METRIC_IDS,
  METRIC_OPTIONS,
  METRIC_ORDER,
  type MetricId,
} from "@/ui/dashboard/metric-cards";

const STORAGE_KEY = "coursemap.dashboard.cards.v1";

function isMetricId(value: unknown): value is MetricId {
  return typeof value === "string" && Object.hasOwn(METRIC_OPTIONS, value);
}

function parseStoredMetricIds(raw: string | null): MetricId[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter(isMetricId))]
      : null;
  } catch {
    return null;
  }
}

/** Local listeners so a toggle in one component updates every subscriber. */
const storageListeners = new Set<() => void>();
let fallbackMetrics: string | null = null;
let storageUnavailable = false;

function readStoredMetrics() {
  try {
    return storageUnavailable
      ? fallbackMetrics
      : window.localStorage.getItem(STORAGE_KEY);
  } catch {
    storageUnavailable = true;
    return fallbackMetrics;
  }
}

function subscribeToStoredMetrics(listener: () => void) {
  storageListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    storageListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * The reader's chosen metric cards, persisted locally per browser. Cards
 * always render in the canonical registry order regardless of the order
 * they were picked in. Reads go through useSyncExternalStore so the server
 * renders the defaults and the client hydrates to the stored choice without
 * a state write inside an effect.
 */
export function useSelectedMetrics() {
  const raw = useSyncExternalStore(
    subscribeToStoredMetrics,
    readStoredMetrics,
    () => null,
  );
  const hydrated = useSyncExternalStore(
    subscribeToStoredMetrics,
    () => true,
    () => false,
  );
  const selected = useMemo(
    () => parseStoredMetricIds(raw) ?? [...DEFAULT_METRIC_IDS],
    [raw],
  );

  const toggle = useCallback((id: MetricId) => {
    const base = parseStoredMetricIds(readStoredMetrics()) ?? [
      ...DEFAULT_METRIC_IDS,
    ];
    const next = base.includes(id)
      ? base.filter((item) => item !== id)
      : METRIC_ORDER.filter((item) => base.includes(item) || item === id);
    fallbackMetrics = JSON.stringify(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, fallbackMetrics);
      storageUnavailable = false;
    } catch {
      storageUnavailable = true;
      // Keep the preference for this session when browser storage is unavailable.
    }
    storageListeners.forEach((listener) => listener());
  }, []);

  return { selected, hydrated, toggle };
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
            Pick the cards you want on your dashboard. Choices are saved on this
            device.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-6">
          {METRIC_ORDER.map((id) => {
            const option = METRIC_OPTIONS[id];
            const checked = selected.includes(id);
            return (
              <label
                key={id}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/60"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(id)}
                  aria-label={option.title}
                  className="mt-0.5"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{option.title}</span>
                  <span className="text-xs text-muted-foreground">
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
