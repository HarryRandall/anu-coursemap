---
name: nextjs-development
description: Implement Coursemap Next.js routes, React state and application data flow. Use for server/client boundaries, mutations, loading and error handling, or feature module design.
---

# Next.js development

Read the affected route and its callers alongside `docs/architecture.md`. Check
`package.json` before using version-specific APIs. Coursemap uses the App Router;
external repository examples may use different routing or state libraries.

## Boundaries and data flow

- Keep pages and layouts server-rendered by default. Put `"use client"` at the interactive boundary rather than moving a whole route into the browser.
- Keep reusable domain calculations in `lib/` with typed inputs. Route handlers and server actions should validate requests, enforce access, call domain code and translate the result.
- Group feature-specific helpers with their feature. Promote code to shared modules when callers need it; avoid speculative service layers or generic wrappers.
- Use concrete imports, including `import type` for type-only dependencies. Shared components and utilities should not import route implementation files.
- Validate external input at the boundary. Narrow unknown values instead of bypassing checks with `as any`.
- Start independent reads together when appropriate. Do not parallelise dependent mutations or move request-specific state into mutable module globals.
- Pass only the data a Client Component needs. Choose caching deliberately for the installed Next.js version and the data's visibility; do not share user-specific results across requests.
- Enforce authorisation in each mutation and protected data entry point. `proxy.ts` protects page prefixes; it does not replace API or server-action checks. Use `supabase-change` for auth and client details.

## React and product behaviour

- Derive filtered lists and other calculated values during rendering. Keep effects for synchronisation with external systems, and user actions in event handlers.
- Use URL state for shareable filters where appropriate, local state for transient interaction, and database persistence for durable plans.
- Prefer explicit variants or composition when a component accumulates unrelated boolean modes. A small component does not need a context provider merely to follow a pattern.
- Model pending, empty, error and successful outcomes. Preserve useful user input when a mutation fails.
- Keep `/onboarding` protected and optional. Students without a primary plan receive an empty state, not a forced onboarding redirect.
- `/login` and `/signup` share `AuthShell`. Social sign-in placeholders announce availability status until an actual provider flow exists.

Use `coursemap-testing` to choose regression coverage and `verify-coursemap` for delivery checks.

## References

Adapt these to Coursemap rather than importing another project's dependencies or structure:

- [Next.js server and client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- [React: unnecessary effects](https://react.dev/learn/you-might-not-need-an-effect).
- [Vercel performance rules](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices): prioritise waterfalls and bundle size; measure before applying minor optimisations.
- [Vercel composition patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns).
- [Bulletproof React module boundaries](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md).
