# Catalogue review design

A field-level review step between an import and publication, modelled on a pull
request: see what changed, check the flagged fields against the ANU source,
resolve each one, then publish.

Status: proposal. The implementation claims and source paths below describe the
original design snapshot and must be checked against current code before use.
See [the catalogue lifecycle](catalogue-workspace-refresh.md) for the documented
workspace behaviour.

## What already exists

Most of this feature is already in the database and unused by the interface.
Read this section before writing any migration.

`course_review_items` is already a change queue with the diff in it:

| Column                                                    | Purpose                                        |
| --------------------------------------------------------- | ---------------------------------------------- |
| `field_path`                                              | which field changed                            |
| `old_value`, `new_value` (jsonb)                          | the diff, already stored per field             |
| `source_locator`, `source_excerpt`                        | the ANU wording behind that field              |
| `is_blocking`                                             | whether it must be resolved before publication |
| `importance`, `confidence`, `issue_code`, `summary`       | why it was flagged                             |
| `status`, `resolved_by`, `resolved_at`, `resolution_note` | per-item resolution                            |

`academic_structure_review_items` has the same resolution columns and
`field_key`, `item_kind`, `severity`, `message`, `source_text`, but **no
`old_value` or `new_value`**. Structures record observations, not changes.

The publication gate already blocks on critical items. From
`app/admin/courses/[id]/course-review.tsx`:

```ts
const canPublish =
  canWrite &&
  isActive &&
  isDraft &&
  record.snapshot?.sealed_at !== null &&
  !record.snapshot?.has_critical_uncertainty &&
  record.blockingReviewItems.length === 0;
```

So the answer to "should publication be blocked on critical items" is that it
already is, for courses. What is missing is any way to see or clear those items.

`resolved_by` is read by **no** application file. The per-item resolution
workflow was modelled and never surfaced. Today the only review action is
accept or reject of a whole import target through
`accept_course_import_target`.

## What is actually missing

1. A review view that shows the changes field by field.
2. A way to resolve one field, rather than a whole target.
3. The same gate and view for academic structures, which have no stored diff.
4. Replacements for the two surfaces this makes redundant: the
   "critical uncertainty" banner and the "Original ANU text" dialog.

## The design

### One review tab per import target

Replaces the current banner. The heading states the work outstanding rather
than a state:

```
Review · 3 of 11 fields need checking

~ Units          6  →  12                    [source] [Resolve]
~ Requisites     COMP1100  →  COMP1100, MATH1005
                 could not parse "or equivalent"   [source] [Resolve]
+ Offerings      6 study periods added             [source] [Resolve]
  Title          unchanged
  College        unchanged
```

Unchanged fields collapse into a single "8 fields unchanged" row. A reviewer
should only read what moved.

### Two kinds of row, kept distinct

Migration `20260827090200` split parser diagnostics out of the change queue for
a good reason, recorded in its own header: 444 of 445 open rows were the parser
reporting on itself, statements "with no old value and no new value, and
therefore nothing for a human to accept or dismiss". The rule it established is
that **a row that cannot state both an old and a new value is not a change**.

The review tab honours that by rendering two row types:

- **Change**: has `old_value` and `new_value`. Shows the before and after.
- **Flag**: an observation with no diff. Shows the message and the source
  excerpt, and can be acknowledged but never presents a fake before and after.

Do not merge these back into one concept.

### Resolving a field

Each row gets a `Resolve` action writing `status`, `resolved_by`, `resolved_at`
and an optional `resolution_note` to the existing columns. Resolution is
per-item and reversible until publication. A resolved row collapses but stays
listed, the way a resolved pull request conversation does.

This needs one new server action per pipeline and one RPC each, alongside the
existing `accept_course_import_target`. It needs no new table.

### The publication gate

Keep the current rule: publication is blocked while any blocking item is open,
warnings may be published over. Two changes:

- The disabled `Publish draft` action states the reason, for example
  "2 critical fields still need checking", rather than being silently disabled.
- `needsExplicitConfirmation` becomes redundant once every critical field is
  individually resolvable, so the separate `Confirm review` action can retire.

### Structures need their diff computed

`academic_structure_review_items` stores no old or new value, so a programme
import has nothing to diff against. Two options:

1. **Compute at review time**. Diff the proposed snapshot against the
   published one when the review tab loads. No migration, no backfill, and it
   stays correct if the published version changes underneath. Slower per view.
2. **Store at import time**. Add `old_value` and `new_value` columns and
   populate them during the pipeline, matching `course_review_items`.
   Faster to read, but the values go stale if the published snapshot moves, and
   existing rows cannot be backfilled honestly. The same migration header warns
   against exactly this: filling in old and new values retrospectively "would
   ship knowingly-wrong flags".

**Recommendation: compute at review time.** It avoids a migration, avoids a
dishonest backfill, and the snapshots are already loaded on that page.

### What this retires

- The banner "This imported draft has critical uncertainty. Review every field
  against the source..." names a state and points nowhere. The review tab
  names the fields and links to them.
- The "Original ANU text" dialog, which dumps an unlabelled block of source with
  nothing to compare it to. The same excerpt belongs inline on the field it
  explains, which is what `source_excerpt` and `source_locator` are for.

## Work breakdown

| Step | Scope                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------- |
| 1    | Review tab for courses, reading existing `course_review_items`, changes and flags rendered distinctly |
| 2    | Per-item resolve action and RPC, courses                                                              |
| 3    | Publish button states its blocking reason; retire `Confirm review`                                    |
| 4    | Structure diff computed at review time from published versus proposed snapshot                        |
| 5    | Same tab and resolve action for structures                                                            |
| 6    | Remove the banner and the ANU text dialog                                                             |

Steps 1 to 3 are worthwhile on their own and touch no schema. Step 4 is the
largest piece of new logic.

## Testing

Per the four layers in `coursemap-testing`:

- **unit**: the diff computation: added, removed, changed, unchanged, and
  nested requirement structures.
- **component**: a change row renders before and after; a flag row renders no
  fake diff; a resolved row collapses.
- **database**: resolving an item writes `resolved_by` and `resolved_at`, and
  the publish gate refuses while a blocking item is open. Both are RLS
  boundaries and belong in pgTAP as well.
- **playwright**: an administrator reviews an import, resolves the flagged
  fields and publishes; publication is refused before that.

## Open questions

1. Should resolving require a note, or is an unexplained tick acceptable for
   obvious cases? A required note is more auditable and slower.
2. Should a second administrator be required for publication, as GitHub can
   require a second approver? The role model supports it; nothing today uses it.
3. Do rejected imports keep their resolutions for the next run of the same
   target, or start clean? Carrying them forward saves rework and risks
   approving a field whose source has since changed.
