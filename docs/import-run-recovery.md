# Recovering structure imports

Programmes, majors, minors and specialisations share one active import run.
An unfinished run therefore blocks imports across all four directories.

Use **Stop run** in any structure directory to cancel the active run's
unfinished targets. This requires `imports.manage`. Completed
outcomes and existing catalogue data are preserved. Worker leases are invalidated,
so later callbacks cannot save more results for a cancelled target. An external
model request already in flight may still finish and incur its normal charge.
If a worker is saving a result at that instant, stopping can fail briefly; retry
after the save finishes.

Starting a run reconciles targets that have remained queued for at least five
minutes with neither a recorded dispatch time nor a queue message ID. These are
marked failed with `QUEUE_DISPATCH_STALE`, freeing the active-run slot when no
unfinished targets remain. This recovery runs when a new start request reaches
the database; it is not a scheduled watchdog. Dispatched or running work can be
stopped manually.

Deploy the `import_run_recovery` migration before using the Stop run API. The
existing `PATCH /api/admin/academic-structure-imports` endpoint also accepts
`{"runId":"<run UUID>"}` to reconcile an abandoned dispatch without this migration.
It uses the current signed-in administrator's permissions and preserves the
original attempt for inspection.
