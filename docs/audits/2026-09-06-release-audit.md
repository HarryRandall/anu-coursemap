# September release audit

Reviewed the current checkout's 20 commits beyond production `90a00b6` and its uncommitted Help, roadmap, navigation and loading changes. Other worktrees were outside this release. The shared ReUI migration is released separately from the remaining page polish.

## Corrections

- Requirement progress now enforces upper unit limits even when a minimum exists, preserves completed credit when a later planned duplicate exists, and does not certify mandatory rules that cannot be measured. A satisfied alternative is no longer invalidated by a different alternative exceeding its limit. Regression tests cover these cases.
- Sidebar state is held above page shells, so client navigation preserves it. Student and administrator menus regain labelled navigation landmarks.
- Onboarding retains a skip action when the catalogue fails to load.
- Dashboard-card preferences preserve an empty selection and tolerate unavailable browser storage.
- Help's calendar guide reflects the month and agenda views. Source assertions were updated for the actual ReUI controls, semantic colours and revised wording. Missing-page tests verify the not-found response and noindex marker even when a loading boundary has already streamed HTTP 200.

The hardcoded degree-composition card and its existing appearance are retained at Harry's explicit request. It is a visual sample rather than a calculation from the student's plan. Development-only preview metrics also remain intentional.

## Verification

- Node 24 full gate: formatting, ESLint, TypeScript, 482 unit tests, five structure tests, 15 rendered tests, seven authentication/access tests, demo and authenticated production builds, and whitespace checks.
- Local database: reset from committed migrations with local preview fixtures; 376 database tests, five catalogue integration tests, schema lint and a byte comparison of generated database types passed.
- Production dependency audit: zero reported vulnerabilities.
- Browser: authenticated student and administrator route smoke tests, real course-review tabs, isolated demo course search and addition, sidebar persistence across client navigation, and mobile Help search. Production data was not edited through the UI.

## Hosted database

Verified the deployed definitions, grants, RLS policies, constraints and trigger for `academic_structure_directory_latest_import_targets` and `app_settings`. Both objects were already present, but their migration history entries were missing. Recorded `20260830090148` and `20260830140000` as applied using migration repair. This changed history only and did not replay table creation or alter user data.

Older local and hosted migration timestamps differ, including the initial admin, requisite and calendar work. These predate this release. A blanket `db push --include-all` would be unsafe; preserve the hosted history and compare the old SQL before any wider reconciliation. No new application schema is required by these UI releases.

Supabase advisers still report authenticated SECURITY DEFINER RPCs, disabled leaked-password protection, overlapping read policies and informational index notices. The inspected RPCs pin an empty search path and contain authentication/permission checks; the local access-control suite passes. These adviser notices are not evidence that every RPC is exposed without authorisation. Password protection and historical policy/index tuning remain separate operational follow-up work; no access policy was loosened to silence a warning.

Development browser runs reported font-preload warnings. Final deployment and CI evidence should be read from the release PRs rather than inferred from local checks.
