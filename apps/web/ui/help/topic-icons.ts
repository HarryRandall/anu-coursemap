import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CircleUserRound,
  GitBranch,
  GraduationCap,
  KeyRound,
  ListChecks,
  Map,
  MapPin,
  Rocket,
  Search,
  ShieldCheck,
  SunMoon,
  type LucideIcon,
} from "lucide-react";
import type { HelpCategoryId } from "@/lib/help";

export const helpTopicIcons: Record<string, LucideIcon> = {
  "getting-started": Rocket,
  "quick-find": Search,
  "appearance-and-navigation": SunMoon,
  "build-your-plan": Map,
  "study-calendar": CalendarDays,
  "key-dates": CalendarRange,
  "room-finder": MapPin,
  "understand-a-course": BookOpen,
  "prerequisite-graph": GitBranch,
  "read-requirements": ListChecks,
  "catalogue-accuracy": ShieldCheck,
  "account-and-degree": CircleUserRound,
  "academic-record": GraduationCap,
  "sign-in-and-access": KeyRound,
};

/**
 * Pastel tint per category, from the default Tailwind palette the marketing
 * surfaces already use. Category is always also shown as text.
 */
export const helpCategoryTints: Record<
  HelpCategoryId,
  { tile: string; chip: string }
> = {
  "getting-started": {
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    chip: "bg-violet-50 text-violet-700 ring-violet-200/70 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
  },
  planning: {
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    chip: "bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
  },
  courses: {
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  },
  account: {
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    chip: "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  },
};
