---
name: verify-coursemap
description: Run and report Coursemap's delivery checks before hand-off, commits or pull requests, or when assessing readiness. Use coursemap-testing for test design and implementation.
---

# Verify Coursemap

Use Node.js 24 and the scripts in `package.json`. Work in the task's checkout so
build output and generated files do not interfere with another active task.

## During development

Run the relevant test file with `pnpm --filter @coursemap/web exec vitest run tests/<name>.test.mjs`, or use
`pnpm test:unit`. Run `pnpm check` for formatting, lint and types.

`pnpm test` runs unit and component coverage. Browser journeys and database tests have separate commands.

## Before hand-off

```bash
pnpm verify
```

This runs formatting, lint, types, unit and structural tests, the demo build and
rendered checks, the auth build and access checks, then `git diff --check`.
Do not run the builds concurrently: they share `apps/web/.next`.

Additional checks depend on the change:

- Database/schema changes: follow `supabase-change` for local migration tests, schema lint, generated types and relevant adviser checks. Running documentation checks does not require resetting a database.
- Authenticated browser journeys: start a dedicated local Supabase stack, seed its fixtures and run `pnpm test:e2e`. Never reuse another task's database or web server.
- UI behaviour: exercise the changed flow in a real browser on desktop and a narrow viewport. Rendered HTTP tests do not replace interaction checks.
- New configuration or dependencies: verify the documented setup and affected build path.

If the full command stops early, report which later stages did not run. Run
independent useful checks where possible, without claiming that they complete
the gate. Distinguish pre-existing failures using evidence from the base commit;
do not assume they are unrelated merely because the edited files are different.

## Report evidence

State the checks that passed, failed or were blocked, and material warnings.
Separate local verification, CI, deployment and observed production behaviour.
Inspect the final diff for generated churn, accidental credentials and unrelated
files. Do not treat successful local checks as permission to publish or deploy.
