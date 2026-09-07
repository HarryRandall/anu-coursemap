---
name: coursemap-workspace
description: Work with Coursemap's pnpm and Turborepo workspace: where a dependency version, script or component belongs, and how to add one without causing drift. Use when adding dependencies, scripts, packages or build configuration.
---

# Coursemap workspace

Three packages: `apps/web` (the Next.js application), `packages/ui` (vendored
ReUI design system) and the repository root (tooling and the database). The
dependency direction is one way. `apps/web` may import `@coursemap/ui`, never
the reverse. `apps/web/tests/workspace-boundaries.test.mjs` and the
`no-restricted-imports` rule in `packages/ui/eslint.config.mjs` both enforce it.

## One version, one place

Every third-party version lives in the `catalog:` block of
`pnpm-workspace.yaml`. Package manifests reference it and never name a version:

```json
"dependencies": { "zod": "catalog:" }
```

To add a dependency, add the version to the catalog and the `catalog:` reference
to the package that needs it, then run `pnpm install`. To upgrade one, edit the
single catalog line. A literal version string in `apps/web/package.json` or
`packages/ui/package.json` is a bug. It reintroduces the drift the catalog
exists to prevent.

Other single sources, none of them duplicated:

| Setting              | Authority                                   |
| -------------------- | ------------------------------------------- |
| Node version         | `.node-version`                             |
| pnpm version         | `packageManager` in the root `package.json` |
| Dependency versions  | `catalog:` in `pnpm-workspace.yaml`         |
| Supabase CLI version | `.github/workflows/ci.yml`                  |

CI reads the first two rather than restating them, so neither appears in a
workflow file.

## Where a script belongs

- Anything operating on the database or the whole repository is a **root**
  script and calls its tool directly. The Supabase project is at the repository
  root, so `db:*` scripts run `supabase ...` with no `--workdir`.
- Anything operating on the application belongs to `@coursemap/web`. The root
  exposes it with `pnpm --filter @coursemap/web <script>` when it is part of the
  documented workflow.
- Task running goes through Turborepo (`turbo run <task>`) so results cache.
  Tasks that touch a live database set `"cache": false` in `turbo.json`.

Add a new task to `turbo.json` when more than one package will run it. Declare
`outputs` for anything that writes files, and `[]` for checks that do not.

## Where a component belongs

`packages/ui` is the design-system layer only: vendored ReUI primitives, the
theme and their utilities. It knows nothing about courses, plans or Supabase.
Anything Coursemap-aware lives in the application:

- `apps/web/ui/common/`: Coursemap compositions used by more than one area.
- `apps/web/ui/<area>/`: components for one feature area.

Follow `packages/ui/README.md` when adding or updating vendored source, and
`coursemap-ui` for applying it. Adding a Coursemap type or a `@/` import to
`packages/ui` breaks the boundary test.

## Adding a package

Create it under `packages/`, give it a `@coursemap/` name, reference catalog
versions, and add `lint` and `typecheck` scripts so the existing Turborepo tasks
pick it up. Export subpaths with wildcard patterns rather than listing every
file:

```json
"exports": { "./primitives/*": "./primitives/*.tsx" }
```

Use `verify-coursemap` for the delivery gate after changing build or dependency
configuration, and re-run `pnpm install --frozen-lockfile` to confirm the
lockfile is committed.
