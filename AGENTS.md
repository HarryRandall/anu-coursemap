# Coursemap agent guide

Read [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and delivery requirements.
Use Node.js 24 and pnpm. Routes live in `apps/web/app/`, product components in `apps/web/ui/`,
and domain logic in `apps/web/lib/`. See [architecture](docs/architecture.md) for boundaries.

## Skills

Load the skills relevant to the task:

- [nextjs-development](.agents/skills/nextjs-development/SKILL.md): routes, React state and data flow.
- [coursemap-ui](.agents/skills/coursemap-ui/SKILL.md): pages, components and accessibility. Also read [UI conventions](apps/web/ui/AGENTS.md).
- [coursemap-testing](.agents/skills/coursemap-testing/SKILL.md): regression coverage and test implementation.
- [supabase-change](.agents/skills/supabase-change/SKILL.md): schema, permissions, auth and generated types.
- [catalogue-import](.agents/skills/catalogue-import/SKILL.md): ANU ingestion and publication.
- [verify-coursemap](.agents/skills/verify-coursemap/SKILL.md): checks before hand-off.

## Safeguards

- Inspect the working tree and preserve unrelated changes. Use an isolated worktree when another task is active.
- Keep durable catalogue and plan data in the database. Regenerate database types rather than editing generated output.
- Keep secrets out of Git and browser bundles. Document configuration requirements in `apps/web/.env.example`.
- Follow the user's delivery scope. Local work does not authorise hosted mutations, deployment or destructive Git operations.
- Run `pnpm verify` before hand-off and report blocked checks explicitly. Keep local, browser, CI and production evidence distinct.
