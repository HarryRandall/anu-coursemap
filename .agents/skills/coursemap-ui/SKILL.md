---
name: coursemap-ui
description: Design, build and review Coursemap pages and components using the repository's accessible shadcn and Radix conventions. Use for changes to course discovery, degree planning, prerequisite exploration, navigation, responsive layouts, visual states or shared UI components.
---

# Coursemap UI

## Overview

Create a calm, modern planning interface without losing the fast course-selection flow or the prerequisite graph. Prefer composable primitives, clear state and keyboard-complete interactions.

## Workflow

1. Read the affected route, feature components and `components/AGENTS.md` before editing.
2. Reuse an existing `components/ui` primitive. If a new primitive is needed, inspect the pinned shadcn registry and review its dry-run diff before adding it.
3. Keep server components as the default. Add `"use client"` only at the narrow interactive boundary.
4. Model loading, empty, error, unauthenticated and success states explicitly.
5. Verify the keyboard path, focus treatment, accessible names, contrast and mobile layout.
6. Run `$verify-coursemap` before hand-off.

## Product rules

- Preserve direct course search, comparison and selection as first-class actions.
- Preserve the prerequisite graph as an explorable view and pair it with equivalent textual status.
- Do not communicate completed, planned, unavailable or missing states through colour alone.
- Use restrained motion and respect `prefers-reduced-motion`.
- Prefer URL state for shareable filters and selections. Keep durable plan data in Supabase, not browser storage.
- Use Lucide icons through the shared icon convention. Do not add a second icon library.
- Keep touch targets at least 44 by 44 CSS pixels where practical.

## Component rules

- Import primitives from their concrete `components/ui/*` modules rather than a barrel file.
- Use semantic HTML before adding ARIA.
- Use Radix or native controls for dialogs, popovers, menus, tooltips and selection widgets.
- Keep domain logic outside visual components and pass typed view models at the boundary.
- Do not copy registry code from the web by hand. Use the configured shadcn MCP or pinned CLI and inspect the result.
