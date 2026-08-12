# Coursemap

A modern ANU degree-planning prototype for mapping courses, prerequisites,
majors, attempts, overload approvals and versioned catalogue rules.

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root redirects to the
degree plan.

## Product routes

- `/plan` - horizontally scrolling semester board with drag-and-drop courses
- `/requirements` - degree and major rule audit
- `/courses` and `/courses/[code]` - filterable catalogue and versioned details
- `/history` - separate course attempts and results
- `/profile` - student, degree, rules-year and major setup
- `/admin` - catalogue KPIs and change monitoring
- `/admin/courses` - full data grid and CSV export
- `/admin/programmes` - degrees, majors, minors and specialisations
- `/admin/relations` - rule-edge table and dependency graph
- `/admin/sync` - schedules, scoped syncs and run history

## Current data boundary

This version uses realistic prototype catalogue records and stores the student's
profile and plan in browser storage. The admin sync is an interactive simulation.
No scraper or database is connected yet. The UI and data model are designed so
the persistence layer can move to Supabase without changing the product model.

## Validation

```bash
npm run lint
npm test
```
