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

Replace the publishable-key placeholder with the local `Publishable` value from
`supabase status`, then open [http://localhost:3000](http://localhost:3000). Do
not commit `.env.local` or any Supabase secret key.

Student and admin routes require a local Supabase account when
`COURSEMAP_DEMO_MODE=false`. Request a magic link at `/auth/sign-in`, then open
the message in the local Mailpit interface reported by `supabase status`.
Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` so PKCE begins and completes
on the same trusted origin. Exact `COURSEMAP_DEMO_MODE=true` is reserved for
the isolated prototype fixture and rendered CI tests.

A free hosted development project is reserved in Sydney, but it currently has
no migrations or public tables. The application, Auth and database remain local
until a hosted migration is explicitly approved. Vercel deployment is also
intentionally disabled.

## Commands

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the development server                  |
| `npm run db:start`     | Start the full local Supabase stack           |
| `npm run db:reset`     | Rebuild the local database from migrations    |
| `npm run db:test`      | Run local pgTAP database tests                |
| `npm run db:lint`      | Run strict local schema linting               |
| `npm run db:types`     | Regenerate committed local database types     |
| `npm run format:check` | Check repository formatting                   |
| `npm run lint`         | Run ESLint and accessibility rules            |
| `npm run typecheck`    | Run strict TypeScript checks                  |
| `npm test`             | Run unit, build and rendered-route tests      |
| `npm run check`        | Run formatting, linting and type checks       |
| `npm run verify`       | Run the complete local quality gate           |
| `npm run build`        | Create the Vercel-compatible production build |

## Repository guide

- `app/` contains App Router routes and layouts.
- `components/` contains product components and shared UI primitives.
- `lib/` contains domain and integration code.
- `supabase/` contains database migrations, seed tooling and local configuration.
- `.agents/skills/` contains repeatable workflows for UI, Supabase, catalogue import and verification work.
- `docs/architecture.md` records the intended boundaries and data model.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## Status

Private alpha. The native Next.js foundation, local Supabase database and local
magic-link authentication are in place. The reserved hosted project remains
empty. Persistent user plans and verified catalogue ingestion are being
introduced through focused pull requests before any hosted migration or Vercel
deployment.
