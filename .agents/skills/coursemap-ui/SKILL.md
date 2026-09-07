---
name: coursemap-ui
description: Build and review Coursemap interfaces with pinned ReUI components and existing product patterns. Use for pages, navigation, responsive layouts, visual states and accessibility.
---

# Coursemap UI

Read `apps/web/ui/AGENTS.md`, the affected route and a comparable existing page.
The component guide owns shared visual conventions; this skill describes how
to apply and verify them.

## Build from existing patterns

1. Identify the user's action and the states the page must support. Inspect the rendered page when changing an existing interface.
2. Search for the existing Coursemap composition before creating another one. Reuse shared list filters, tabs, dialogs and tooltips.
3. Import pinned primitives from `@coursemap/ui/primitives/*` and extended components from `@coursemap/ui/components/*`. `apps/web/ui/ui` holds Coursemap compositions, not a second primitive library.
4. Follow `apps/web/ui/reui/README.md` when adding or updating upstream components. Preserve retained source and licence; review dependencies and keep only what the product needs.
5. Keep domain calculations outside visual components. Use `nextjs-development` when changing state or server/client boundaries.

## Preserve product meaning

- Keep direct course search and selection easy to reach. Pair prerequisite graphs with readable requirement status.
- Distinguish completed, planned and missing requirements through text or icons as well as colour.
- Provide loading, empty, error and permission states that tell the user what they can do next.
- Prefer native semantics and the supplied interaction primitives. Verify keyboard operation, focus return, accessible names and Escape behaviour where relevant.
- Respect reduced motion and keep controls usable on touch screens. Inspect narrow layouts for clipped actions and accidental page-wide overflow.

## Review the result

Compare the rendered result with the chosen existing pattern. Exercise the
changed interaction on desktop and a narrow viewport, including its meaningful
failure or empty state. Inspect the browser console after interaction.

Use `coursemap-testing` for regression coverage and `verify-coursemap` for the
repository gate. Report visual checks separately from static and build checks.

## References

- [Supabase Studio task-specific UI guidance](https://github.com/supabase/supabase/blob/master/apps/studio/AGENTS.md) informs the routing approach, not Coursemap's component API.
- [W3C ARIA practice guidance](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) explains the interaction obligations of custom widgets.
