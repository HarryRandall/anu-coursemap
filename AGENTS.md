# Coursemap agent guide

Read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution conventions and the delivery workflow. Use Node.js 24 and npm.

## Find the right code

| Area                                    | Location                                     |
| --------------------------------------- | -------------------------------------------- |
| Routes, layouts and HTTP handlers       | `app/`, `proxy.ts`                           |
| Product UI and retained ReUI components | `components/`                                |
| Domain logic and integrations           | `lib/`                                       |
| Database migrations and policies        | `supabase/`                                  |
| Application tests                       | `tests/`                                     |
| Application and data boundaries         | [docs/architecture.md](docs/architecture.md) |

## Choose the relevant skill

Load skills for the work in scope, rather than every skill for every task.

| Task                                                     | Skill                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| Next.js routes, React state, data flow and module design | [nextjs-development](.agents/skills/nextjs-development/SKILL.md) |
| Product pages, components, styling and accessibility     | [coursemap-ui](.agents/skills/coursemap-ui/SKILL.md)             |
| Choosing, writing or reviewing tests                     | [coursemap-testing](.agents/skills/coursemap-testing/SKILL.md)   |
| Schema, RLS, auth, clients or generated database types   | [supabase-change](.agents/skills/supabase-change/SKILL.md)       |
| ANU source ingestion and catalogue publication           | [catalogue-import](.agents/skills/catalogue-import/SKILL.md)     |
| Final checks and delivery evidence                       | [verify-coursemap](.agents/skills/verify-coursemap/SKILL.md)     |

## Repository safeguards

- Inspect the working tree before editing or switching branches. Preserve unrelated changes and use an isolated worktree when another task is active.
- Follow [components/AGENTS.md](components/AGENTS.md) for interface work. Retained ReUI source has its own update procedure; do not replace it with duplicate primitives.
- Keep durable catalogue and plan data in the database, not hardcoded runtime arrays or browser storage.
- Keep secrets out of source and browser bundles. Update `.env.example` when configuration requirements change.
- Regenerate database types through the documented command rather than editing generated output.
- Local changes do not authorise hosted database mutations or deployment. Follow the user's requested delivery scope; do not force-push shared branches or use destructive Git commands without explicit approval.
- Run `npm run verify` before hand-off. Report blocked checks explicitly; a build or static check does not prove browser behaviour or production health.
