# Coursemap database

This directory is the source of truth for Coursemap's Supabase configuration,
forward-only migrations and database tests.

## Project

- Project ref: `mogdmhkqkpvksvtvwdgl`
- Region: Sydney (`ap-southeast-2`)
- Plan: Supabase Free

The hosted project is reserved but intentionally has no migrations or public
tables. The application currently uses the local Supabase stack. Browser-safe
local values belong in `.env.local`; service-role keys and database passwords
must never be committed.

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

## Local administrator access

Application roles live in the private schema and are never inferred from an
email address or editable user metadata. After signing in locally, a developer
can grant the seeded catalogue administrator role from Supabase Studio's SQL
editor, replacing the example address:

```sql
insert into private.user_roles (user_id, role_id, granted_by)
select users.id, roles.id, users.id
from auth.users as users
cross join private.app_roles as roles
where users.email = 'developer@example.test'
  and roles.key = 'catalogue_admin'
on conflict (user_id, role_id) do nothing;
```

This is a privileged local operation. Coursemap's browser client cannot grant
roles, and hosted role assignments require a separate reviewed process.
