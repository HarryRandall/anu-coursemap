# Coursemap architecture

## Product boundaries

Coursemap has three product areas:

1. Public catalogue discovery and prerequisite exploration.
2. Authenticated student profiles, attempts and degree plans.
3. Authorised catalogue import, review and administration.

Next.js owns routing, server rendering and mutations. Supabase Auth owns identity. Supabase Postgres is the durable source of truth. Vercel builds and serves the application.

## Application structure

- Route components load data on the server by default.
- Client components are limited to interaction boundaries such as search, drag-and-drop and graph exploration.
- Authenticated students without a primary plan are routed to `/onboarding` before the dashboard; the wizard creates the profile and primary plan in one server action.
- Domain rules remain framework-independent and operate on typed inputs.
- Supabase clients are request-scoped. Server and browser clients live behind separate modules.
- Generated database types are committed and used at every query boundary.

## Data model

Catalogue identity and year-specific facts are separate:

- `catalogue_years`, `courses` and `course_versions`
- `academic_periods`, `course_offerings` and `offering_sessions`
- `course_rules`, nested `course_rule_groups` and `course_rule_conditions`
- versioned `academic_structures` and `requirement_groups`
- `university_calendar_events` keyed by calendar year, date and title

User-owned planning data is also separate:

- `profiles`
- `plans` and ordered `plan_items`
- `course_attempts`
- approval requests and immutable approval events

Catalogue imports record sources, hashes, run outcomes and review items. Ambiguous source material remains reviewable instead of being flattened into plausible but incorrect rules.

## Access model

- Published catalogue rows may be readable publicly.
- Draft catalogue and import operations require database-backed application roles.
- A user can access only their own profile, plans, items and attempts.
- Every exposed table has RLS and explicit Data API grants.
- Privileged functions have a deliberate `search_path`, minimal execution grants and database tests.

## Delivery

Changes move through focused branches and pull requests. GitHub Actions checks formatting, linting, types, tests and the production build. Vercel creates preview deployments and promotes `main` after checks. Supabase schema changes remain forward-only migrations in the same pull request as their application code.
