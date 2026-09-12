# Coursemap agent guide

Read [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and delivery requirements.
See [code conventions](docs/conventions.md) for naming and comments and the
[documentation index](docs/README.md) for current guides and historical records.
Use Node.js 24 and pnpm. Routes live in `apps/web/app/`, shared product components in
`apps/web/ui/common/`, feature components in `apps/web/ui/<area>/`, domain logic in
`apps/web/lib/` and the vendored design system in `packages/ui/`. Dependency versions live
only in the `catalog:` block of `pnpm-workspace.yaml`. See [architecture](docs/architecture.md)
for boundaries.

## Skills

Load the skills relevant to the task:

- [coursemap-conventions](.agents/skills/coursemap-conventions/SKILL.md): house style, naming, comments and file placement.
- [coursemap-workspace](.agents/skills/coursemap-workspace/SKILL.md): dependencies, scripts, packages and build configuration.
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
