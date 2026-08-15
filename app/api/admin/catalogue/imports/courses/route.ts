import { NextResponse } from "next/server";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import {
  CatalogueImportConfigurationError,
  runSelectedCourseImport,
} from "@/lib/catalogue-import/run-selected-course-import";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportRequest = {
  catalogueYear?: unknown;
  courseCodes?: unknown;
};

export async function POST(request: Request) {
  if (!(await canManageCatalogueImports())) {
    return NextResponse.json(
      { error: "Import permission is required." },
      { status: 403 },
    );
  }

  let payload: ImportRequest;
  try {
    payload = (await request.json()) as ImportRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid import request." },
      { status: 400 },
    );
  }

  const catalogueYear = Number(payload.catalogueYear);
  const courseCodes = Array.isArray(payload.courseCodes)
    ? payload.courseCodes.filter(
        (code): code is string => typeof code === "string",
      )
    : [];

  try {
    const result = await runSelectedCourseImport({
      catalogueYear,
      courseCodes,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CatalogueImportConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Course import failed.",
      },
      { status: 422 },
    );
  }
}
