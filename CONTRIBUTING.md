# Contributing

Coursemap is currently a private project. Keep changes focused, reviewable and reproducible.

## Workflow

1. Create a branch prefixed with `feat/`, `fix/` or `refactor/`.
2. Make one coherent change and update tests and documentation with it.
3. Run `npm run verify`.
4. Open a pull request using the repository template.
5. Merge only after required checks pass.

Use conventional commit subjects such as `feat: add email sign-in` or `refactor: move catalogue reads to Supabase`. Write in British English, use straight apostrophes and avoid em dashes.

## Database changes

- Put forward-only SQL migrations in `supabase/migrations`.
- Enable RLS and add explicit grants and policies for every exposed relation.
- Regenerate committed TypeScript database types after applying a migration.
- Include tests for ownership boundaries and privileged actions.
- Never expose a service-role key to browser code.

## Catalogue changes

Catalogue data must include its source, catalogue year and retrieval provenance. Do not treat prototype fixtures, generated timetables or inferred prerequisite rules as authoritative ANU data.
