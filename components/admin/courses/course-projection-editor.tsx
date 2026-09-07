"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@reui/components/alert";
import { Button } from "@reui/ui/button";
import { Textarea } from "@reui/ui/textarea";
import { JsonCode } from "@/components/ui/json-code";
import type { CourseSnapshotProjectionData as Projection } from "@/lib/course-import/project-snapshot";
import { parseCourseSnapshotProjection } from "@/lib/course-import/snapshot-projection-contract";
import type { AdminCourseYearRecord } from "@/lib/coursemap/admin-course-year";
import {
  collectionEditorValue,
  preparedProjection,
} from "@/lib/coursemap/course-workspace-projection";

// Retain access to uncommon relational fields without making JSON the course editor.
export function CourseProjectionEditor({
  canEdit,
  onEditingChange,
  onSave,
  record,
}: {
  canEdit: boolean;
  onEditingChange: (editing: boolean) => void;
  onSave: (projection: Projection) => Promise<void>;
  record: AdminCourseYearRecord;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  function finish() {
    setEditing(false);
    onEditingChange(false);
    setError(null);
  }
  async function save() {
    setError(null);
    setSaving(true);
    try {
      const projection = parseCourseSnapshotProjection(JSON.parse(value));
      if (
        projection.courseCode !== record.code ||
        projection.academicYear !== record.year
      )
        throw new Error("Course code and academic year cannot change.");
      // The captured source date is provenance, not an editable course field.
      projection.snapshot.sourceUpdatedAt =
        record.projection?.snapshot.sourceUpdatedAt ?? null;
      await onSave(
        preparedProjection(
          record,
          projection.snapshot,
          collectionEditorValue(projection),
        ),
      );
      finish();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The projection could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-4">
      {editing ? (
        <div className="space-y-4 p-5">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Complete course projection
            <Textarea
              className="min-h-[32rem] font-mono text-xs"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
            />
          </label>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={saving} onClick={finish}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save draft"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <JsonCode
            label="Canonical course projection"
            value={record.projection}
          />
          {canEdit && record.projection ? (
            <div className="flex justify-end px-5 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setValue(JSON.stringify(record.projection, null, 2));
                  setEditing(true);
                  onEditingChange(true);
                }}
              >
                Edit advanced fields
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
