# Coursemap agent guide

## Project

Coursemap is a Next.js App Router application for discovering ANU courses, understanding prerequisite paths and building degree plans. Supabase provides authentication and the persistent Postgres data model. Vercel is the deployment target.

## Working conventions

- Use British English, straight apostrophes and no em dashes in prose, comments and commit messages.
- Use Node.js 24 and npm. Keep the lockfile committed.
- Keep server components as the default and client boundaries narrow.
- Prefer feature-oriented modules and concrete imports over broad barrel files.
- Add or change database objects only through forward-only files in `supabase/migrations`.
- Regenerate committed Supabase database types after schema changes.
- Never commit secrets. Update `.env.example` whenever a required variable changes.
- Do not store catalogue or durable plan data in hardcoded runtime arrays or browser storage.
- Preserve unrelated user changes and inspect the working tree before switching branches.

## Quality gate

Use the `$verify-coursemap` skill and run `npm run verify` before hand-off. The full gate is formatting, linting, type checking, tests, production build and `git diff --check`. Add browser verification for behaviour changes and Supabase adviser checks for database changes.

## UI

Read `components/AGENTS.md` and use `$coursemap-ui` for interface work. Prefer repository primitives built from shadcn and Radix. Preserve the direct course-selection experience and prerequisite exploration while improving structure and accessibility.

## Auth and onboarding

- `/login` and `/signup` share the `AuthShell` split layout and the email-and-password Supabase flow.
- Social sign-in buttons are placeholders until OAuth ships: they announce that the provider is coming soon and must never start a broken flow.
- A signed-in student without a primary plan is routed to `/onboarding` before the dashboard. Keep that guard on the default post-auth route and keep `/onboarding` in the proxy's protected prefixes.

## Supabase

Use `$supabase-change` for schema, RLS, auth, client or generated-type work. Every exposed table requires explicit grants and RLS. Never expose a service-role key to the browser. Use the official SSR client pattern and verified claims for protected server access.

## Catalogue data

Use `$catalogue-import` for source ingestion. Keep catalogue years, versions, provenance and import runs explicit. Treat ambiguous source material as review work, not an excuse to invent authoritative data.

## Git and delivery

- Use small branches prefixed with `feat/`, `fix/` or `refactor/`.
- Use conventional commits such as `feat:`, `fix:` and `refactor:`.
- Open a pull request for each coherent change and merge only after required checks pass.
- Do not force-push shared branches or use destructive Git commands without explicit approval.
