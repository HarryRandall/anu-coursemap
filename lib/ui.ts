import type { Accent } from "@/lib/catalogue";
import type { EffectiveStatus } from "@/lib/planner";

/**
 * Accent colour system for course tokens, plan card rails and legends.
 * Mapped onto the stock Tailwind palette so everything stays cohesive.
 */
export const accent: Record<
  Accent,
  { token: string; bar: string; dot: string; ring: string }
> = {
  blue: {
    token: "bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
    ring: "ring-sky-200",
  },
  violet: {
    token: "bg-brand-50 text-brand-700",
    bar: "bg-brand-500",
    dot: "bg-brand-500",
    ring: "ring-brand-200",
  },
  mint: {
    token: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  amber: {
    token: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
  },
  rose: {
    token: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
  },
  cyan: {
    token: "bg-cyan-50 text-cyan-700",
    bar: "bg-cyan-500",
    dot: "bg-cyan-500",
    ring: "ring-cyan-200",
  },
};

/** Visual tone shared by badges and status pills. */
export type Tone =
  "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

/** Map an effective plan status to a tone + label. */
export const statusTone: Record<EffectiveStatus, Tone> = {
  completed: "success",
  failed: "danger",
  planned: "info",
  enrolled: "info",
  blocked: "warning",
  approval: "warning",
};

/** Build simple {value,label} options from a list of years. */
export function yearOptions(years: number[], suffix = "") {
  return years.map((year) => ({ value: year, label: `${year}${suffix}` }));
}

/** Map a parse/review state string to a tone. */
export function parseTone(state: string): Tone {
  switch (state.toLowerCase()) {
    case "verified":
    case "complete":
      return "success";
    case "review":
      return "warning";
    case "failed":
      return "danger";
    case "automatic":
      return "brand";
    default:
      return "neutral";
  }
}
