import type { Accent } from "@/lib/catalogue";

export const sessionSurface: Record<
  Accent,
  { block: string; bar: string; chip: string }
> = {
  blue: {
    block: "bg-sky-50 text-sky-950 ring-sky-200/80 hover:bg-sky-100/90",
    bar: "bg-sky-500",
    chip: "bg-sky-200/80 text-sky-800",
  },
  violet: {
    block: "bg-brand-50 text-brand-950 ring-brand-200/80 hover:bg-brand-100/90",
    bar: "bg-brand-500",
    chip: "bg-brand-200/80 text-brand-800",
  },
  mint: {
    block:
      "bg-emerald-50 text-emerald-950 ring-emerald-200/80 hover:bg-emerald-100/90",
    bar: "bg-emerald-500",
    chip: "bg-emerald-200/80 text-emerald-800",
  },
  amber: {
    block: "bg-amber-50 text-amber-950 ring-amber-200/80 hover:bg-amber-100/90",
    bar: "bg-amber-500",
    chip: "bg-amber-200/80 text-amber-800",
  },
  rose: {
    block: "bg-rose-50 text-rose-950 ring-rose-200/80 hover:bg-rose-100/90",
    bar: "bg-rose-500",
    chip: "bg-rose-200/80 text-rose-800",
  },
  cyan: {
    block: "bg-cyan-50 text-cyan-950 ring-cyan-200/80 hover:bg-cyan-100/90",
    bar: "bg-cyan-500",
    chip: "bg-cyan-200/80 text-cyan-800",
  },
};
