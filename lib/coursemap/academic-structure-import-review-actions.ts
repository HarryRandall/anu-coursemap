"use server";

import { revalidatePath } from "next/cache";
import { canManageCourseImports, canWriteCatalogue } from "@/lib/auth/viewer";
import type { CoursemapActionResult } from "@/lib/coursemap/actions";
import { allAdminAcademicStructureCollectionPaths } from "@/lib/coursemap/academic-structure-routes";
import { createClient } from "@/lib/supabase/server";

type ReviewDecisionInput = {
  runId: string;
  targetId: string;
  reviewNote?: string;
};

type PublishInput = {
  runId: string;
  targetId: string;
  structureYearId: number;
  snapshotId: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normaliseReviewInput(input: ReviewDecisionInput) {
  if (!validUuid(input.runId) || !validUuid(input.targetId)) {
    throw new TypeError("Choose a valid academic structure import.");
  }
  const reviewNote = input.reviewNote?.trim() || null;
  if (reviewNote && reviewNote.length > 2_000) {
    throw new TypeError("The review note must be 2,000 characters or fewer.");
  }
  return { ...input, reviewNote };
}

function reviewErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String(error.message);
    if (/draft changed after this import completed/i.test(message)) {
      return "The draft changed after this import completed. Refresh and review the current draft before deciding.";
    }
    if (/not ready for review/i.test(message)) {
      return "This import target is no longer awaiting a review decision.";
    }
  }
  return "Coursemap could not save the review decision.";
}

function publicationErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String(error.message);
    if (/exact current draft/i.test(message)) {
      return "The draft changed before publication. Refresh and review the current draft.";
    }
    if (/blocking review items|critical uncertainty/i.test(message)) {
      return "Resolve blocking review items and critical uncertainty before publishing.";
    }
    if (/publication permission/i.test(message)) {
      return "Catalogue publication permission is required.";
    }
  }
  return "Coursemap could not publish this academic structure.";
}

function revalidateImport(runId: string, targetId: string) {
  revalidatePath("/admin/imports/structures/runs");
  revalidatePath(`/admin/imports/structures/runs/${runId}`);
  revalidatePath(`/admin/imports/structures/runs/${runId}/targets/${targetId}`);
  for (const path of allAdminAcademicStructureCollectionPaths()) {
    revalidatePath(path);
  }
}

async function decide(
  decision: "accepted" | "rejected",
  input: ReviewDecisionInput,
): Promise<CoursemapActionResult> {
  if (!(await canManageCourseImports())) {
    return {
      ok: false,
      message: "Academic structure import permission is required.",
    };
  }

  try {
    const reviewed = normaliseReviewInput(input);
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "review_academic_structure_import_target",
      {
        p_target_id: reviewed.targetId,
        p_decision: decision,
        p_note: reviewed.reviewNote ?? undefined,
      },
    );
    if (error) throw error;
    revalidateImport(reviewed.runId, reviewed.targetId);
    return {
      ok: true,
      message:
        decision === "accepted"
          ? "The candidate is now the draft. It has not been published."
          : "The candidate was rejected. The current draft and published snapshot were not changed.",
    };
  } catch (error) {
    return { ok: false, message: reviewErrorMessage(error) };
  }
}

export async function acceptAcademicStructureImportTarget(
  input: ReviewDecisionInput,
) {
  return decide("accepted", input);
}

export async function rejectAcademicStructureImportTarget(
  input: ReviewDecisionInput,
) {
  return decide("rejected", input);
}

export async function publishAcademicStructureDraft(
  input: PublishInput,
): Promise<CoursemapActionResult> {
  if (!(await canWriteCatalogue())) {
    return {
      ok: false,
      message: "Catalogue publication permission is required.",
    };
  }
  if (
    !validUuid(input.runId) ||
    !validUuid(input.targetId) ||
    !Number.isInteger(input.structureYearId) ||
    input.structureYearId <= 0 ||
    !Number.isInteger(input.snapshotId) ||
    input.snapshotId <= 0
  ) {
    return { ok: false, message: "Choose a valid academic structure draft." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "publish_academic_structure_snapshot",
      {
        p_structure_year_id: input.structureYearId,
        p_snapshot_id: input.snapshotId,
      },
    );
    if (error) throw error;
    revalidateImport(input.runId, input.targetId);
    return {
      ok: true,
      message: "The current draft is now published.",
    };
  } catch (error) {
    return { ok: false, message: publicationErrorMessage(error) };
  }
}
