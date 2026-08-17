import { NextResponse } from "next/server";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!(await canManageCatalogueImports())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogue_years")
    .select("year")
    .in("status", ["draft", "published"])
    .order("year", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Catalogue years are unavailable." },
      { status: 502 },
    );
  }

  return NextResponse.json({ years: (data ?? []).map((item) => item.year) });
}
