---
name: supabase-change
description: Plan, implement and verify safe Supabase database, authentication, Row Level Security and generated-type changes for Coursemap. Use for migrations, policies, grants, functions, seed data, auth flows, Supabase clients or schema-driven application changes.
---

# Supabase change

## Overview

Ship every Supabase change as reviewed code with least-privilege access, reproducible migrations and a verification trail. The database is the source of truth for users, catalogues and plans.

## Workflow

1. Inspect the existing migrations, generated types and callers before designing the change.
2. Write a forward-only migration under `supabase/migrations`. Do not make an untracked dashboard-only schema change.
3. Add explicit table, column, constraint and index names where they improve diagnostics.
4. Enable RLS and define explicit grants and policies for every exposed table, view or function.
5. Apply the migration through the Supabase connector or CLI, then regenerate `types/database.ts` from the linked project.
6. Run database tests, relevant application tests and Supabase security and performance advisers.
7. Record any manual dashboard configuration in the pull request and repository documentation.

## Security rules

- Never expose the service-role key to browser code, logs, commits or pull requests.
- Use request-scoped server clients and the official `@supabase/ssr` cookie pattern.
- Protect server routes with verified claims or users, not an unverified client session.
- Treat `auth.users` as identity infrastructure. Store application profile data in public tables keyed to `auth.users.id`.
- Read authorisation from database-owned role tables or trusted claims, never user-editable metadata.
- Make owner checks cheap and obvious. Add indexes for columns used by RLS policies and foreign keys.
- Set `search_path` deliberately on security-definer functions and revoke unnecessary execution.

## Data rules

- Keep catalogue provenance, catalogue year and source hashes with imported records.
- Keep user plans separate from historical attempts.
- Do not represent a prerequisite as satisfied by a course planned in the same teaching period.
- Prefer normalised relations and typed columns over opaque JSON for queryable domain data.
- Make imports idempotent and preserve reviewable exceptions.
