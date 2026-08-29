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

Course identity, year-specific records and immutable saved states are separate:

- `academic_years`, `course_directory_entries`, `courses` and `course_years`
- `course_snapshots` and their relational fees, attributes, outcomes, assessments,
  offerings, sessions and requisite rules
- `course_rules`, nested `course_rule_groups` and `course_rule_conditions`
- `catalogue_years`, versioned `academic_structures` and `requirement_groups`
  remain the programme data model until the later programme migration
- `university_calendar_events` keyed by calendar year, date and title

User-owned planning data is also separate:

- `profiles`
- `plans` and ordered `plan_items`
- `course_attempts`
- approval requests and immutable approval events

Course imports run asynchronously through a private Vercel Queue consumer. A
durable run contains no more than ten course targets. Each target records HTML,
normalised Markdown, model input, deterministic extraction, strict OpenRouter
output, validation, relational projection and its change set. Large artefacts
are content-addressed in a private Storage bucket while Postgres stores their
hashes and provenance. Imports never publish. Every changed candidate remains
immutable and requires an administrator to accept or reject it before a
separate publication action.

New queue publishing is feature-gated, but the private consumer always drains
messages already accepted by Vercel. A target receives no more than five
processing attempts. Infrastructure failures while claiming or recording a
terminal result may receive up to twelve bounded queue deliveries, after which
the database's stale-run recovery can fail only expired processing leases or
dispatched targets that have remained queued for more than 30 minutes.

The private `course-import-artifacts` bucket is declared in
`supabase/config.toml`. A production rollout managed outside Supabase's GitHub
integration must run `npm run db:storage:buckets:linked` against the linked
project after applying migrations and before enabling directory refreshes or
queue publishing. Database migrations alone do not create that hosted bucket.

Ambiguous source material remains reviewable instead of being flattened into
plausible but incorrect rules. Deterministic values win model conflicts, model
claims require evidence from the selected academic year's source, and related
course codes create identities only rather than recursive imports.

## Access model

- Published catalogue rows may be readable publicly.
- Draft catalogue and import operations require database-backed application roles.
- A user can access only their own profile, plans, items and attempts.
- Every exposed table has RLS and explicit Data API grants.
- Privileged functions have a deliberate `search_path`, minimal execution grants and database tests.

## Delivery

Changes move through focused branches and pull requests. GitHub Actions checks formatting, linting, types, tests and the production build. Vercel creates preview deployments and promotes `main` after checks. Supabase schema changes remain forward-only migrations in the same pull request as their application code.
