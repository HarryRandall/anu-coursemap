# Coursemap database

This directory is the source of truth for Coursemap's Supabase configuration,
forward-only migrations and database tests.

## Project

- Project ref: `mogdmhkqkpvksvtvwdgl`
- Region: Sydney (`ap-southeast-2`)
- Plan: Supabase Free

The hosted development project carries the complete migration history, Row
Level Security policies and the reviewed 2026 structure seed. Day-to-day
development uses the local Supabase stack. Browser-safe local values belong in
`.env.local`; service-role keys and database passwords must never be
committed.

## Workflow

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
npm run db:types
```

Create each schema change with `supabase migration new <name>`. Rebuild locally,
regenerate `types/database.ts`, run the database gates, then run
`npm run verify`. Applying migrations to the hosted project requires explicit
approval and is a separate step.

`seed.sql` intentionally contains no catalogue or user fixtures. Authoritative
catalogue data must be imported with source URLs, retrieval metadata and
content hashes.

## Administrator access

Application roles live in the private schema and are never inferred from an
email address or editable user metadata. The first administrator must be
bootstrapped from Supabase Studio's SQL editor, replacing the example address:

```sql
insert into private.user_roles (user_id, role_id, granted_by)
select users.id, roles.id, users.id
from auth.users as users
cross join private.app_roles as roles
where users.email = 'developer@example.test'
  and roles.key = 'admin'
on conflict (user_id) do update
set
  role_id = excluded.role_id,
  granted_by = excluded.granted_by,
  granted_at = now();
```

Every new account receives the `User` role. This is the only bootstrap
operation. Afterwards, an admin can open `/admin/users` and switch an account
between `User` and `Admin`. Role permissions are database-managed and editable
from `/admin/roles`. The database prevents admins from changing their own role
or removing the final admin.
