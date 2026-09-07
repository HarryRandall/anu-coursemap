---
name: coursemap-testing
description: Choose and implement Coursemap regression tests with Vitest, React Testing Library, local database tests and Playwright. Use verify-coursemap for delivery checks.
---

# Coursemap testing

Choose the smallest test that catches the failure. Domain tests run in Vitest's
Node project, component behaviour in its jsdom project with React Testing
Library, and routes and browser journeys in Playwright against a built app.

- Use explicit Vitest imports and direct TypeScript module imports. Test discovery is automatic under `apps/web/tests`.
- Keep database tests in `*.database.test.mjs` or the existing `*-database.test.mjs` naming convention and the serial database project. Retain pgTAP under `supabase/tests`.
- Use observable outputs, roles and accessible names. Source assertions are reserved for intentional structural boundaries, not UI behaviour.
- Reuse local fixtures. Give browser-created users and plans unique test-owned identifiers and clean up those records. Authenticate through the real local flow and keep storage state untracked.
- Refuse hosted database URLs. Keep paid extraction and queue publishing disabled. Never reset another task's local database.
- Use Playwright's server lifecycle with `reuseExistingServer: false`. Do not attach tests to an arbitrary developer server.
- Check keyboard operation, focus return, empty/error states and narrow viewports. Inspect browser errors after interaction.

Run a focused domain test with `pnpm --filter @coursemap/web exec vitest run tests/requisite-conditions.test.mjs`.
Run unit and component coverage with `pnpm test` and database integration with `pnpm test:catalogue-db`.

Demo and authenticated profiles share `apps/web/.next`, so build and test them
sequentially. Verification owns the full delivery command sequence.
