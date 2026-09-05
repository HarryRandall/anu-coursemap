# ReUI source

This directory contains the complete free ReUI component registry at upstream
commit `8a2c701eaf95729f238274d5ce2555a5a8bd23e7` (v2.5.2). ReUI is MIT licensed;
the upstream licence is preserved in `LICENSE.md`.

- `components/` contains all 77 `registry:ui` ReUI modules.
- `ui/`, `hooks/` and `lib/` contain their shadcn dependencies.
- `catalogue/` contains all 1,105 free Radix examples across the 74 categories
  in ReUI's public source.
- `catalogue-data/` contains generated metadata and lazy component loaders for
  the searchable catalogue.
- `examples/` contains one representative upstream example for each of the 22
  reusable ReUI primitive families shown in the original laboratory pages.
- `icon-placeholder.tsx` keeps ReUI's icon API but resolves it to Coursemap's
  existing Lucide dependency.
- `theme.css` scopes ReUI's semantic tokens to `.reui-scope` so the existing
  Coursemap and Untitled UI components are unaffected.

The public registry endpoint required authorisation when fetched on 3 September
2026, so this snapshot was copied from the official public GitHub repository.
Only import paths were mechanically rewritten from the upstream registry layout
to the isolated `@reui/*` alias. A small number of compatibility rewrites adapt
upstream Recharts and Event Calendar examples to the dependency versions already
used by Coursemap. The original Gantt representative's optional live-now marker
is off by default because its time-dependent position otherwise differs between
server rendering and hydration.

Regenerate the free catalogue from a checked-out copy of the pinned official
repository with:

```bash
node scripts/sync-reui-free-components.mjs /path/to/reui
```

The generator checks the expected total and category counts before writing the
catalogue. ReUI's 533 Pro blocks are not part of the public MIT source and are
not included here.
