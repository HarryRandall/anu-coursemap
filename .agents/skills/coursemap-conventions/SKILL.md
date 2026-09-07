---
name: coursemap-conventions
description: Write Coursemap code that matches the existing house style: module and naming conventions, comments, error messages, British English prose and file placement. Use when adding or restructuring any TypeScript, React or script source.
---

# Coursemap conventions

These are observed conventions, not aspirations. Before adding a file, read the
nearest existing sibling and match it. When this guide and the surrounding code
disagree, follow the surrounding code and say so.

## Modules and naming

- File names are kebab-case: `plan-catalogue.ts`, `import-review-tabs.tsx`. No
  other casing appears in the repository.
- Export named symbols. `export default` is reserved for Next.js route files
  (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`) and config
  files. No component or library module uses a default export.
- Prefer `export function` over `export const` for functions. Reserve
  `export const` for values and `export type` for types.
- Import types with `import type`, and keep type-only imports separate from
  value imports.
- One responsibility per module. When a file grows a second responsibility,
  split it rather than adding a section comment.

## One component per file

A file defines one component. When a second independent component appears,
move it to its own kebab-case file named after it. A component that only its
own file can reach cannot be tested, reviewed or reused on its own.

Two exceptions:

- Compound components that form a single API stay together:
  `Alert`/`AlertTitle`/`AlertDescription`, `Card`/`CardHeader`. Splitting these
  breaks the idiom the vendored primitives follow.
- `packages/ui` is vendored and kept diffable against upstream. Never
  restructure it.

Private helper functions inside one cohesive component are fine. A long file
is not itself a reason to split; a second component in it is.

## Comments

Most modules contain no comments at all, and that is correct. Add one only when
the code cannot state the reason itself: a non-obvious constraint, a workaround
with a cause, or a deliberate deviation. Write full sentences.

```ts
// jsdom does not perform layout. Real resize behaviour is covered in Playwright.
```

Do not restate the code, label sections, leave `TODO` markers without an owner
and a reason, or narrate a change ("now uses...", "updated to..."). The diff
records history; the file records intent.

## Errors and user-facing text

- Error messages are complete sentences with a definite article and a final full
  stop: `throw new Error("The course import target was not claimed.")`.
- Describe what did not happen, not what the caller should have done.
- Interface copy must tell the reader something the surrounding interface does
  not already show. See `apps/web/ui/AGENTS.md` for the copy rules.

## Prose

British English throughout code, comments, documentation and interface copy:
_organise_, _behaviour_, _catalogue_, _licence_ (noun). Use straight
apostrophes. Do not use em dashes. This applies to commit subjects and pull
request descriptions too.

## Placement

| Kind of code                                    | Location                   |
| ----------------------------------------------- | -------------------------- |
| Route, layout, loading and error boundaries     | `apps/web/app/<route>/`    |
| Coursemap component used by more than one route | `apps/web/ui/common/`      |
| Coursemap component for one feature area        | `apps/web/ui/<area>/`      |
| Domain calculation, data access, parsing        | `apps/web/lib/`            |
| Vendored ReUI primitive or component            | `packages/ui/`             |
| Operational script                              | `apps/web/scripts/<area>/` |

Keep domain calculations out of components: a component reads state and renders
it. Keep client components as small as the interaction requires. Just over half
the tree is server-rendered, and that ratio is deliberate.

## Scripts

Operational scripts are `.mjs`, export their behaviour as a named function with
injectable collaborators, and guard the entry point so tests can import them
without running them.

```js
export async function seedLocalPreview({ createClient = createLocalDatabaseClient } = {}) { ... }

const isMainModule = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1]
  : false;

if (isMainModule) { ... }
```

Use `coursemap-workspace` for where a script and its command belong, and
`coursemap-testing` for the coverage the change needs.
