# Catalogue operations

## Course and academic-structure imports

Use the admin catalogue workspace to refresh the directory for an academic year,
then select records for a background import. Directory refreshes store lightweight
codes and titles; they do not publish detailed records.

Import targets retain their source, transformations, extraction and validation
for review. Accepting a proposed snapshot and publishing it are separate actions.
See [architecture](architecture.md) for the data model and queue behaviour, and
[.env.example](../.env.example) for worker configuration.

ANU Programs and Courses remains the authoritative source. Preserve the selected
year and evidence when reviewing extracted facts. Unsupported requirements must
remain review items. Public redistribution of captured source content requires
a separate rights decision.

## University calendar

Fetch a reviewable manifest from the [ANU university calendar](https://www.anu.edu.au/directories/university-calendar), then import it into local Supabase:

```bash
npm run calendar:fetch -- --year 2026 --output .catalogue-cache/anu-calendar-2026.json
npm run calendar:import -- .catalogue-cache/anu-calendar-2026.json
```

Change the year and filename together. The import script refuses hosted database
connections. Each manifest keeps the source URL, retrieval time, content hash and
parser diagnostics.

A clean import publishes validated events idempotently using year, date and title,
and archives previously published events missing from the manifest. A manifest
with error diagnostics records a failed run and leaves published events untouched.
Review diagnostics and removals before importing. Calendar publication differs
from the draft-review workflow for course and academic-structure snapshots.

Academic periods inferred from class dates still need verification against the
official calendar; importing calendar events does not itself reconcile them.
