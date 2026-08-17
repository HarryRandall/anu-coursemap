import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";

type AcademicPeriodRow = {
  calendar_year: number;
  code: string;
  ends_on: string;
  name: string;
  short_name: string;
  starts_on: string;
};

function formatDateRange(startsOn: string, endsOn: string) {
  const format = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${format.format(new Date(startsOn))} to ${format.format(new Date(endsOn))}`;
}

export async function GET() {
  if (isDemoMode()) {
    const { terms: demoTerms } = await import("@/lib/catalogue");
    return NextResponse.json({ terms: demoTerms.slice(0, 6) });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("academic_periods")
    .select("calendar_year,code,ends_on,name,short_name,starts_on")
    .eq("status", "published")
    .order("calendar_year")
    .order("sort_order");
  if (error) {
    return NextResponse.json(
      { error: "Semester options are temporarily unavailable." },
      { status: 503 },
    );
  }

  const terms = ((data ?? []) as AcademicPeriodRow[]).map((period) => ({
    id: `${period.calendar_year}-${period.code.toLowerCase()}`,
    year: period.calendar_year,
    name: period.name,
    shortName: period.short_name,
    dates: formatDateRange(period.starts_on, period.ends_on),
  }));
  terms.push({
    id: "unscheduled",
    year: 9999,
    name: "Later",
    shortName: "Later",
    dates: "Choose when ready",
  });
  return NextResponse.json({ terms });
}
