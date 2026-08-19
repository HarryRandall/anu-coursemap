# Coursemap

Coursemap helps ANU students discover courses, understand prerequisite paths and build a degree plan they can explain. It is being rebuilt as a private, production-minded Next.js application backed by Supabase and intended for Vercel.

> [!NOTE]
> Coursemap is an independent planning tool. It is not an official ANU system and does not replace the Programs and Courses catalogue or academic advice.

## What it does

- searches and filters versioned course information
- visualises prerequisite relationships and missing requirements
- separates planned courses from completed attempts
- audits a plan against degree and major requirements
- provides reviewable catalogue administration and import workflows

The existing course-selection and prerequisite experiences are intentionally being preserved while the prototype data and browser-only state are moved to a secure, multi-user data model.

## Stack

- [Next.js](https://nextjs.org/) App Router with React and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) with shadcn and Radix primitives
- [Supabase](https://supabase.com/) for Postgres, authentication and Row Level Security
- [Vercel](https://vercel.com/) for previews and production deployment
- GitHub Actions for repository checks

## Local development

Requirements:

- Node.js 24
- npm 10
- Docker Desktop and the local Coursemap Supabase stack
- Supabase CLI 2.x for local database migrations and tests

```bash
supabase start
cp .env.example .env.local
npm install
npm run dev
```

For local Supabase, replace the publishable-key placeholder with the local
`Publishable` value from `supabase status`. To use the hosted development
project, set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its API URL and publishable key. Then
open [http://localhost:3000](http://localhost:3000). Do not commit `.env.local`
or any Supabase secret key.

Student and admin routes require an account in the configured Supabase project
when `COURSEMAP_DEMO_MODE=false`. Create an email-and-password account at
`/auth/sign-up`. New accounts without a primary plan are routed to
`/onboarding` before the dashboard. Local email confirmations are disabled in
`supabase/config.toml` so the account receives a session immediately. Disable
**Confirm email** under **Authentication > Sign In / Providers > Email** in a
hosted Supabase project before enabling password-only sign-up there. Exact
`COURSEMAP_DEMO_MODE=true` is reserved for the isolated prototype fixture and
rendered CI tests.

The first catalogue administrator is granted once through the reviewed SQL in
`supabase/README.md`. That administrator can then manage user role assignments
at `/admin/users`; effective permissions remain migration-owned and read-only.

The Sydney hosted development project has the complete migration history,
Row Level Security policies and the reviewed 2026 BCOMP and SOFT-MAJ structure
seed. Its Auth redirect configuration accepts the trusted local callback.

## Commands

| Command                    | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `npm run dev`              | Start the development server                  |
| `npm run db:start`         | Start the full local Supabase stack           |
| `npm run db:reset`         | Rebuild the local database from migrations    |
| `npm run db:test`          | Run local pgTAP database tests                |
| `npm run db:lint`          | Run strict local schema linting               |
| `npm run db:types`         | Regenerate committed local database types     |
| `npm run db:grant-preview` | Grant one local user draft catalogue access   |
| `npm run catalogue:fetch`  | Fetch official ANU HTML into a local manifest |
| `npm run catalogue:import` | Import a manifest into local Supabase         |
| `npm run format:check`     | Check repository formatting                   |
| `npm run lint`             | Run ESLint and accessibility rules            |
| `npm run typecheck`        | Run strict TypeScript checks                  |
| `npm test`                 | Run unit, build and rendered-route tests      |
| `npm run check`            | Run formatting, linting and type checks       |
| `npm run verify`           | Run the complete local quality gate           |
| `npm run build`            | Create the Vercel-compatible production build |

The catalogue fetcher defaults to 44 Coursemap courses, including every course
referenced by the authoritative 2026 [Bachelor of Computing](https://programsandcourses.anu.edu.au/2026/program/BCOMP)
and [Software Development major](https://programsandcourses.anu.edu.au/2026/major/SOFT-MAJ)
structures. It never writes to the database. Give it a new path inside the
ignored local cache, or use `--stdout` for a pipeline:

```bash
npm run catalogue:fetch -- --output .catalogue-cache/anu-2026.json
```

Each manifest retains its official canonical URL, retrieval time, content hash,
raw requisite text and parser diagnostics. Existing manifest files are never
overwritten, so prior source provenance remains reviewable.

Import a captured manifest only after the local Supabase stack is running:

```bash
npm run catalogue:import -- .catalogue-cache/anu-2026.json
```

The importer discovers the local database port from `supabase/config.toml`, or
accepts `COURSEMAP_DATABASE_URL` when it targets a literal loopback address or
exact `localhost`. It refuses hosted and other non-loopback databases. Each
manifest is validated before a connection transaction begins, then its source,
year, run, documents, courses, versions, offerings and sessions are reconciled
through natural keys in one transaction. Re-running the same manifest preserves
domain rows and content-hash snapshots while recording a new import run.
Ambiguous prerequisite text and conflicting source facts remain attached to
open review items rather than being treated as verified catalogue rules.

### Selected-course web sync

An administrator with `imports.manage` can run a selected set of up to 100
course pages from **Admin > Imports > Course pages**. The runner fetches the
official ANU pages, validates the manifest and uses the same idempotent
transaction as the local CLI. The browser keeps four short, server-side import
requests in flight so a selected batch does not rely on a long-running worker.

Local demo mode targets the local Supabase database. For a Vercel production
deployment, set `COURSEMAP_IMPORT_DATABASE_URL` only in the Production
environment to a hosted Supabase PostgreSQL connection URL. It is server-only
and must never use an `NEXT_PUBLIC_` name. It is used only by the authenticated
server-side import route and must never be exposed to the browser.

The 2026 BCOMP and SOFT-MAJ structures are also stored as forward-migrated,
normalised facts with official source hashes. Supported course, structure,
subject, level and elective rules are typed. Maximum-unit caps, tag rules,
COMP3500's 6+6 sequence and programme exclusions stay explicit in the review
queue. Both structures remain `draft` and `review` until those exceptions and
the six other major versions are resolved.

Draft catalogue rows remain hidden by RLS. To test them with an existing local
Auth account, grant the narrow preview role by email:

```bash
npm run db:grant-preview -- student@example.com
```

This command refuses non-loopback database connections. Signed-in students can
then save their profile, primary programme and major, planned course periods and
recorded results through owner-scoped database RPCs. Reloading the application
hydrates that state from Supabase rather than browser storage.

ANU Programs and Courses pages remain the authoritative source. Cached
manifests are ignored local review artefacts; Coursemap stores normalised facts
with their provenance, not a replacement catalogue. Imported rows remain
`draft` or `review` until an authorised reviewer explicitly verifies and
publishes them. Any public redistribution of captured ANU source content needs
a separate rights decision before it is enabled.

Shared academic periods are currently inferred from course class start and end
dates, retained as draft provenance and flagged for review. They must be
verified against the official ANU University Calendar before publication. A
later forward migration can retain class dates in dedicated session columns and
import calendar periods from their own authoritative source.

## Repository guide

- `app/` contains App Router routes and layouts.
- `components/` contains product components and shared UI primitives.
- `lib/` contains domain and integration code.
- `supabase/` contains database migrations, seed tooling and local configuration.
- `.agents/skills/` contains repeatable workflows for UI, Supabase, catalogue import and verification work.
- `docs/architecture.md` records the intended boundaries and data model.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## Status

Private alpha. The native Next.js foundation, local Supabase authentication,
owner-scoped student plan persistence and draft ANU catalogue are in place. The
reserved hosted project remains empty. Verified catalogue publication is the
next data milestone.
