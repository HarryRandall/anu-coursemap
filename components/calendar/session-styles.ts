import type { Accent } from "@/lib/catalogue";

export const sessionSurface: Record<
  Accent,
  { block: string; edge: string; bar: string; chip: string }
> = {
  blue: {
    block: "bg-sky-50/90 text-sky-950 ring-sky-200/70 hover:bg-sky-100",
    edge: "border-l-sky-500",
    bar: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700",
  },
  violet: {
    block: "bg-brand-50/90 text-brand-950 ring-brand-200/70 hover:bg-brand-100",
    edge: "border-l-brand-500",
    bar: "bg-brand-500",
    chip: "bg-brand-100 text-brand-700",
  },
  mint: {
    block:
      "bg-emerald-50/90 text-emerald-950 ring-emerald-200/70 hover:bg-emerald-100",
    edge: "border-l-emerald-500",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    block: "bg-amber-50/90 text-amber-950 ring-amber-200/70 hover:bg-amber-100",
    edge: "border-l-amber-500",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700",
  },
  rose: {
    block: "bg-rose-50/90 text-rose-950 ring-rose-200/70 hover:bg-rose-100",
    edge: "border-l-rose-500",
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
  },
  cyan: {
    block: "bg-cyan-50/90 text-cyan-950 ring-cyan-200/70 hover:bg-cyan-100",
    edge: "border-l-cyan-500",
    bar: "bg-cyan-500",
    chip: "bg-cyan-100 text-cyan-700",
  },
};
