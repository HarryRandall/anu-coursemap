# Coursemap

Coursemap helps ANU students discover courses, explore prerequisites and build degree plans.

> Coursemap is an independent planning tool. It is not an official ANU system and does not replace the ANU Programs and Courses catalogue or academic advice.

## Features

- Search courses and explore prerequisite relationships.
- Plan study and track completed course attempts.
- Check degree and major requirements.
- Explore campus buildings and rooms with Room Finder.
- Browse university calendar key dates.
- Import, review and publish catalogue records through the admin workspace.

## Stack

Next.js App Router, React, TypeScript and Tailwind CSS, with ReUI components.
Supabase provides Postgres, authentication and storage; Vercel hosts the application and import queues.

## Development

Use Node.js 24 and npm 10. Local database development also requires Docker and the Supabase CLI; use the CLI version pinned in [CI](.github/workflows/ci.yml).

```bash
npm ci
cp .env.example .env.local
npm run db:start
npm run dev:local
```

Open [127.0.0.1:3000](http://127.0.0.1:3000) and create an account at `/signup`.
`dev:local` reads connection settings from the running local Supabase stack.
Onboarding is optional.

For a disposable local preview catalogue, run `npm run db:reset` before starting
the app. This resets the local database and loads labelled demonstration data.
See the [database guide](supabase/README.md) for administration and migrations.

To use an existing hosted project, set its matching public URL and publishable
key in `.env.local`, set `NEXT_PUBLIC_SITE_URL` to your development origin, then
run `npm run dev`. Keep credentials out of Git. Import workers require additional
server settings documented in [.env.example](.env.example).

## Common commands

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the app with your configured environment |
| `npm run dev:local` | Start the app against local Supabase           |
| `npm run check`     | Check formatting, lint and types               |
| `npm run test:unit` | Run the unit test suite                        |
| `npm run verify`    | Run the full repository quality gate           |
| `npm run build`     | Build for production                           |

See [package.json](package.json) for all commands.

## Working on Coursemap

- [Contributing](CONTRIBUTING.md): workflow, conventions and pull requests.
- [Architecture](docs/architecture.md): application boundaries and data model.
- [Database](supabase/README.md): local setup, migrations and administrator access.
- [Catalogue operations](docs/catalogue-operations.md): imports and calendar commands.
- [Agent guide](AGENTS.md): repository guidance and task-specific skills.
