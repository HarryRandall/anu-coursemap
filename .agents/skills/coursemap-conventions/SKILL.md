---
name: coursemap-conventions
description: "Write Coursemap code that matches the existing house style: module and naming conventions, comments, error messages, British English prose and file placement. Use when adding or restructuring any TypeScript, React or script source."
---

# Coursemap conventions

Read [the shared conventions](../../../docs/conventions.md) before adding or
restructuring source. That document owns naming, exports, comments and placement
for both human contributors and agents.

1. Inspect the nearest sibling and the callers of the affected API.
2. Choose a domain-specific name and put the file in the owning area. Preserve
   framework contracts, generated types and vendored source.
3. Use comments for non-obvious contracts and constraints. See
   `apps/web/lib/planner.ts` for course-lookup return semantics; avoid adding
   documentation that repeats a function's name or TypeScript signature.
4. Review the diff for unnecessary renames, import churn and change narration.
   If surrounding code conflicts with the shared conventions, apply the rule to
   the changed code and explain any exception needed for compatibility.

Use `coursemap-workspace` for dependencies and commands, `coursemap-ui` for
interface work and `verify-coursemap` for delivery checks.
