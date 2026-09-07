---
name: coursemap-testing
description: Choose, write and review regression tests for Coursemap domain logic, database behaviour and user journeys. Use for test implementation and coverage decisions; use verify-coursemap to run the delivery gate.
---

# Coursemap testing

Choose the smallest test that would catch the failure. Read nearby tests and
`package.json` first: this repository uses Node's test runner, database tests and
rendered HTTP checks. Do not introduce Vitest, Storybook or a browser test runner
solely because a reference repository uses it.

## Choose the layer

| Change                                     | Useful coverage                                               | Existing reference                                                                    |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Prerequisites, units, plan calculations    | Typed inputs and observable results, including boundary cases | `tests/requisite-conditions.test.mjs`, `tests/requirement-progress.test.mjs`          |
| Source parsing and transformation          | Captured fixtures, malformed input and provenance             | `tests/university-calendar-parser.test.mjs`, `tests/course-import-transform.test.mjs` |
| Permissions, constraints and persistence   | Real local database assertions across relevant roles          | `supabase/tests/`, `tests/course-snapshot-persistence-database.test.mjs`              |
| Route output and redirect access           | Built-app HTTP checks                                         | `tests/rendered-html.test.mjs`, `tests/auth-access.test.mjs`                          |
| Interactive selection, forms or navigation | Real browser interaction on the affected flow                 | Inspect the current browser tooling before choosing automation                        |

For a bug, reproduce the failing behaviour where practical before fixing it.
Tests should distinguish the broken result from the intended result, rather
than merely restating implementation details. Source-text checks can enforce a
specific structural contract, but do not prove that a component works.

## Fixtures and assertions

- Keep cases deterministic: control relevant dates, timezone assumptions and input data. Calendar dates and teaching periods deserve explicit boundary cases.
- Reuse `tests/helpers/` where it fits. Model external services at a controlled boundary; do not call paid extraction services in routine tests.
- Exercise failure paths that matter: rejected permissions, unsupported requisite clauses, incomplete sources and repeated imports.
- Database tests must use their documented local setup. Inspect reset and seed behaviour before running them; never point tests at a hosted database.
- For browser automation, prefer accessible role/name locators, isolated test state and retrying assertions over CSS structure or arbitrary sleeps.
- Check behaviour and visual appearance separately. An HTTP response or HTML assertion does not exercise hydration, focus, dragging or responsive overflow.

## UI coverage decisions

For the changed interaction, consider keyboard operation, focus return, disabled
and pending states, empty/error results and a narrow viewport. Check console
errors after interaction. Use screenshot comparisons when appearance is the
regression being prevented; do not replace behaviour assertions with snapshots.

Documentation and low-impact cosmetic edits do not need artificial tests.
Explain material gaps rather than adding tests solely to increase a count.
When adding a test file, check whether the appropriate npm script discovers it:
`test:unit` currently lists its files explicitly.

## Focused commands

```bash
node --test tests/requisite-conditions.test.mjs
npm run test:unit
```

Rendered checks require the matching build: `test:build:demo` then
`test:rendered`, or `test:build:auth` then `test:auth-access`. Both builds use
`.next`; do not run them concurrently in the same checkout. Use
`verify-coursemap` for the full gate and outcome reporting.

## References

- [Primer's behaviour, state and accessibility checklist](https://github.com/primer/react/blob/main/contributor-docs/testing.md).
- [Playwright resilient tests](https://playwright.dev/docs/best-practices).
- [Next.js test layers and server-component limitations](https://nextjs.org/docs/app/guides/testing).
