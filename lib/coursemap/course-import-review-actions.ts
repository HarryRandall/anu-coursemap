"use server";

import { revalidatePath } from "next/cache";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import type { CoursemapActionResult } from "@/lib/coursemap/actions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ReviewDecisionInput = {
  runId: string;
  targetId: string;
  expectedBaselineDraftSnapshotId: number | null;
  expectedCurrentDraftSnapshotId: number | null;
  resolutionNote?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normaliseInput(input: ReviewDecisionInput) {
  if (!UUID_PATTERN.test(input.runId) || !UUID_PATTERN.test(input.targetId)) {
    throw new TypeError("Choose a valid course import target.");
  }
  const note = input.resolutionNote?.trim() || null;
  if (note && note.length > 2_000) {
    throw new TypeError("The review note must be 2,000 characters or fewer.");
  }
  return { ...input, resolutionNote: note };
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String(error.message);
    if (/stale|changed after this import began/i.test(message)) {
      return "This course changed after the import began. Refresh and review the current draft before deciding.";
    }
    if (/not awaiting review/i.test(message)) {
      return "This import target is no longer awaiting a review decision.";
    }
  }
  return "Coursemap could not save the review decision.";
}

async function decide(
  decision: "accept" | "reject",
  input: ReviewDecisionInput,
): Promise<CoursemapActionResult> {
  if (!(await canManageCatalogueImports())) {
    return { ok: false, message: "Course import permission is required." };
  }

  try {
    const reviewed = normaliseInput(input);
    const supabase = await createClient();
    const { error } =
      decision === "accept"
        ? await supabase.rpc("accept_course_import_target", {
            p_target_id: reviewed.targetId,
            p_expected_baseline_snapshot_id:
              reviewed.expectedBaselineDraftSnapshotId,
            p_expected_current_draft_snapshot_id:
              reviewed.expectedCurrentDraftSnapshotId,
            p_resolution_note: reviewed.resolutionNote ?? undefined,
          } as unknown as Database["public"]["Functions"]["accept_course_import_target"]["Args"])
        : await supabase.rpc("reject_course_import_target", {
            p_target_id: reviewed.targetId,
            p_resolution_note: reviewed.resolutionNote ?? undefined,
          });
    if (error) throw error;

    revalidatePath(`/admin/imports/runs/${reviewed.runId}`);
    revalidatePath(
      `/admin/imports/runs/${reviewed.runId}/targets/${reviewed.targetId}`,
    );
    revalidatePath("/admin/courses");
    return {
      ok: true,
      message:
        decision === "accept"
          ? "The candidate is now the draft snapshot. It has not been published."
          : "The candidate was rejected. The current draft and published snapshot were not changed.",
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function acceptCourseImportTarget(input: ReviewDecisionInput) {
  return decide("accept", input);
}

export async function rejectCourseImportTarget(input: ReviewDecisionInput) {
  return decide("reject", input);
}

export async function recoverStalledCourseImportRun(
  runId: string,
): Promise<CoursemapActionResult> {
  if (!(await canManageCatalogueImports())) {
    return { ok: false, message: "Course import permission is required." };
  }
  if (!UUID_PATTERN.test(runId)) {
    return { ok: false, message: "Choose a valid course import run." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "fail_expired_course_import_targets",
      { p_run_id: runId },
    );
    if (error) throw error;
    const result = data?.[0];
    revalidatePath(`/admin/imports/runs/${runId}`);
    revalidatePath("/admin/imports/runs");
    revalidatePath("/admin/courses");
    return {
      ok: true,
      message:
        result && result.newly_failed_target_count > 0
          ? `${result.newly_failed_target_count} stalled target${result.newly_failed_target_count === 1 ? " was" : "s were"} marked failed.`
          : "No expired or stale queued targets were found.",
    };
  } catch {
    return {
      ok: false,
      message: "Coursemap could not recover stalled import work.",
    };
  }
}
