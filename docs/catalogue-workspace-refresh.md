# Catalogue workspace refresh

Course, programme, major and minor workspaces own content editing, review and
publication. Import target pages are read-only records of individual runs, with a
retry action that creates a new run.

## Draft and review lifecycle

- The first valid import creates an unpublished draft automatically.
- Later imports remain proposals and never replace a working draft silently.
- Manual edits create descendant snapshots. Reviewing their original import
  preserves the edited draft and resolves the original review requirement.
- Publication checks unresolved review requirements across the draft's ancestry.
- ANU text comes from the original imported snapshot or recorded evidence. Manual
  edits are never presented as original ANU text.

## Interface organisation

- Course data is the default course tab, followed by Requisites, Course preview,
  Source and Pipeline. Programmes, majors and minors share section editors.
- Section editors save complete validated projections, preserving untouched
  fields and linked records. Advanced relational fields remain under Source.
- Requisites and academic requirements offer a readable builder and diagram.
- Saved and planned database rows share one inspector. Empty tables are hidden
  initially; search accepts both readable and database names.
- Source artefacts retain individual attempts and original diagnostic payloads.

## Legacy and database scope

The migration is forward-only and changes draft/review functions and triggers.
It does not delete catalogue data. Earlier migrations already removed obsolete
review and version tables. The older catalogue import and source-document tables
remain in use by calendar ingestion and must not be removed as unused.

The local preview seed no longer creates variable-unit options for fixed-unit
courses. Existing local fixtures require reseeding separately to pick up that
correction; this change does not reset an existing database.

Apply `20260907020121_automatically_prepare_first_catalogue_drafts.sql` through the
normal migration release process before deploying the corresponding application.
Local verification does not constitute a production migration or deployment.
