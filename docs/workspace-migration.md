# Workspace migration

## Regression coverage

| Responsibility                                                         | Replacement                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Domain calculations and parser regressions                             | Vitest Node discovery with direct TypeScript imports                |
| Serial catalogue persistence and concurrency                           | Vitest database project plus the existing pgTAP suite               |
| HTTP rendering, legacy redirects and access checks                     | Playwright demo and access projects with managed production servers |
| Import artefact loading, retry and database projections                | `apps/web/tests/import-viewers.test.tsx`                            |
| Read-only course and structure inspection tabs                         | `apps/web/tests/import-review-tabs.test.tsx`                        |
| Year sorting and model-save/import sequencing                          | `apps/web/tests/directory-controls.test.tsx`                        |
| Sign-up, optional onboarding, student navigation and independent plans | Authenticated Playwright journeys with test-owned accounts          |
| Admin collections and course review tabs                               | Authenticated Playwright journeys                                   |
| Shared package dependency direction                                    | `apps/web/tests/workspace-boundaries.test.mjs`                      |

The old per-test compilation loaders and UI-source regular expressions for
import reviews are removed. Table projection calculations retain their domain
coverage. Source checks that enforce database or module boundaries remain.
Browser fixtures delete their accounts, cascading their independent plans.
Run pgTAP on freshly seeded data before directory integration tests, which
exercise directory replacement semantics.

## Deployment

The existing `coursemap` project retains its previous settings: repository root,
Node 24, Next.js framework detection, automatic installation and the default
Next.js build/output settings. Do not change these until the migration is ready
to merge. Production deployment remains a separate authorised step.

The separate `coursemap-workspace-preview` project uses:

- Root directory: `apps/web`, with access to workspace files outside that directory.
- Node 24 and Next.js.
- Install: `cd ../.. && npx --yes pnpm@12.3.4 install --frozen-lockfile`.
- Build: `npx --yes pnpm@12.3.4 build`.

Queue topics, function paths, durations and retries remain unchanged in
`apps/web/vercel.json`. The preview uses placeholder backend configuration and
disabled queue publishing. Real authentication and persistence are verified
against isolated local Supabase, not hosted user data.

Keep existing required checks `Quality gate` and `Database gate`. Add `Browser
gate` to branch protection only when this workflow has passed. GitHub branch
protection is not changed by this migration.

For rollback after an authorised production cutover, restore the former root
and automatic install/build settings together with the previous application
commit. Never deploy a root setting that does not match its source layout.

Preview validation: [workspace deployment](https://coursemap-workspace-preview-bv53zypx0-coursemap.vercel.app) built successfully. Login, logo and bundled CSS returned 200; `/plan` returned a 307 login redirect. The original project configuration remains unchanged.
