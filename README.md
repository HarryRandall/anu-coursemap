# Coursemap

An independent ANU course and degree planner with prerequisite exploration,
progress tracking, campus Room Finder and university key dates. Catalogue
imports are reviewed and published through the admin workspace.

Built with Next.js, React, TypeScript, Tailwind CSS and ReUI. Supabase provides
the database, authentication and storage; Vercel hosts the app and import queues.

Coursemap is not an official ANU system. Use the ANU catalogue and academic
advice to confirm your study requirements.

## Development

Use Node.js 24, pnpm 12.3.4, Docker and the Supabase CLI version pinned in [CI](.github/workflows/ci.yml).

```bash
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm db:start
pnpm dev:local
```

Open [127.0.0.1:3000](http://127.0.0.1:3000) and sign up. For a disposable preview
catalogue, `pnpm db:reset` resets the local database and loads demonstration data.

For a hosted project, configure its matching URL and publishable key plus your
local site origin in `apps/web/.env.local`, then use `pnpm dev`. See
[environment example](apps/web/.env.example) for configuration and [package.json](package.json)
for commands. Run `pnpm verify` before submitting changes.

[Contributing](CONTRIBUTING.md) · [Architecture](docs/architecture.md) ·
[Database setup](supabase/README.md) · [Agent guide](AGENTS.md)
