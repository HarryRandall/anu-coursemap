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
`/signup`. New accounts without a primary plan are routed to
`/onboarding` before the dashboard. Local email confirmations are disabled in
`supabase/config.toml` so the account receives a session immediately. Disable
**Confirm email** under **Authentication > Sign In / Providers > Email** in a
hosted Supabase project before enabling password-only sign-up there. Exact
`COURSEMAP_DEMO_MODE=true` is reserved for the isolated prototype fixture and
rendered CI tests.

The first catalogue administrator is granted once through the reviewed SQL in
`supabase/README.md`. That administrator can then manage user role assignments
at `/admin/users` and edit database-managed role permissions at `/admin/roles`.

The Sydney hosted development project has the complete migration history,
Row Level Security policies and the reviewed 2026 BCOMP and SOFT-MAJ structure
seed. Its Auth redirect configuration accepts the trusted local callback.

## Commands

| Command                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `npm run dev`              | Start the development server                   |
| `npm run dev:local`        | Start port 3000 with local Supabase settings   |
| `npm run db:start`         | Start the full local Supabase stack            |
| `npm run db:reset`         | Rebuild the local database from migrations     |
| `npm run db:test`          | Run local pgTAP database tests                 |
| `npm run db:lint`          | Run strict local schema linting                |
| `npm run db:types`         | Regenerate committed local database types      |
| `npm run db:grant-preview` | Grant one local user draft catalogue access    |
| `npm run calendar:fetch`   | Fetch the ANU university calendar for a year   |
| `npm run calendar:import`  | Import a calendar manifest into local Supabase |
| `npm run format:check`     | Check repository formatting                    |
| `npm run lint`             | Run ESLint and accessibility rules             |
| `npm run typecheck`        | Run strict TypeScript checks                   |
| `npm test`                 | Run unit, build and rendered-route tests       |
| `npm run check`            | Run formatting, linting and type checks        |
| `npm run verify`           | Run the complete local quality gate            |
| `npm run build`            | Create the Vercel-compatible production build  |

Course imports start from **Admin > Courses**. Refreshing a year stores the
lightweight ANU code and title directory without creating detailed course
records. An administrator can then select up to ten courses for a durable
background run. Each target preserves its fetched source, transformations,
model extraction, validation and relational snapshot for review. Publication
is always a separate administrator action.

### University calendar key dates

The `/key-dates` page shows the official ANU university calendar for a year:
teaching periods, examination windows, enrolment and fee deadlines, graduations
and public holidays. Events are scraped from the
[ANU university calendar](https://www.anu.edu.au/directories/university-calendar)
with a reviewable manifest-then-import pipeline:

```bash
npm run calendar:fetch -- --year 2026 --output .catalogue-cache/anu-calendar-2026.json
npm run calendar:import -- .catalogue-cache/anu-calendar-2026.json
```

Each manifest keeps the canonical source URL, retrieval time, content hash and
parser diagnostics. The importer records a catalogue import run and a calendar
source document, publishes validated events idempotently through their natural
key (year, date, title), and archives previously published events that a clean
manifest no longer contains. A manifest with error diagnostics records a failed
run and leaves published events untouched.

The development cutover deliberately clears previous course identities,
versions, plans, attempts and programme rows. The canonical course schema then
starts empty: `courses` owns stable codes, `course_years` owns one academic
year and `course_snapshots` owns each immutable imported or manually edited
state. Rich fees, offerings, assessments, outcomes and requisite trees belong
to an exact snapshot. `course_source_pages` and import artefacts retain the
source and every transformation used to produce it.

Draft course snapshots remain hidden by RLS until an authorised reviewer has
inspected the source, model output, relational projection and review items,
then explicitly publishes the snapshot. Student plan and attempt RPCs accept
only an explicit course year and preserve the exact published snapshot used at
the time. Programmes, majors, minors and specialisations use separate admin
routes backed by the same year-specific directory, durable import, immutable
draft review and explicit publication workflow.

ANU Programs and Courses pages remain the authoritative source. Coursemap
stores normalised facts with immutable provenance, not a replacement
catalogue. Imported snapshots remain drafts until an authorised reviewer
explicitly confirms uncertain fields and publishes them. Any public
redistribution of captured ANU source content needs a separate rights decision
before it is enabled.

Shared academic periods are currently inferred from course class start and end
dates, retained as draft provenance and flagged for review. They must be
verified against the official ANU University Calendar before publication. The
university calendar itself is imported as `university_calendar_events` through
`npm run calendar:fetch` and `npm run calendar:import`; a later forward
migration can align academic periods with those verified dates.

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
owner-scoped student plan persistence and review-first course import workflow
are in place. The hosted development database is intentionally disposable and
starts with no detailed course or programme records after the clean cutover.
