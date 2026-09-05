# Coursemap x Untitled UI laboratory

`/design-system` is a development-only reference implementation of Untitled UI
for Coursemap. It exists so component families can be compared against the
official documentation and approved before anything in `components/ui` or a
production screen changes.

## What is here

| Path                                  | What it is                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `components/design-system/untitled/`  | Untitled UI React, vendored verbatim. Third-party MIT source. Do not edit. |
| `components/design-system/coursemap/` | Coursemap components for the families Untitled UI keeps behind PRO.        |
| `components/design-system/lab/`       | The laboratory itself: shell, section registry, fixtures and 32 sections.  |
| `app/design-system/`                  | Routes and the laboratory's own Tailwind entry point.                      |

See `provenance.md` for exactly how the vendored source was fetched and what was
changed. See `component-inventory.md` for the per-family source and status.

## Two Tailwind entry points

`app/globals.css` already defines, inside `@theme`, `--color-brand-*`,
`--shadow-*` and a deliberately tight `--radius-*` scale that
`components/AGENTS.md` documents as load-bearing for the whole application's
shape. Untitled UI's `theme.css` collides with all three, and its components are
drawn against Tailwind's default `rounded-lg` of `0.5rem`.

The laboratory therefore has its **own** Tailwind entry, `design-system.css`,
loaded only by `app/design-system/layout.tsx`:

- `@import "tailwindcss" source(none)` plus explicit `@source` directives, so
  this build scans only laboratory files.
- The vendored `theme.css` and `typography.css`.
- The three plugins the vendored source needs: `tailwindcss-react-aria-components`
  for the `selected:` and `pressed:` variants, `tailwindcss-animate` for
  `animate-in` and `animate-out`, and `@tailwindcss/typography` for `prose`.
- `--font-inter: "Inter Variable"`, because that is the family
  `@fontsource-variable/inter` registers and Untitled UI's theme reads
  `--font-inter`.

`app/globals.css` is not touched. Production routes never load this stylesheet.

### Known limitation

The laboratory's CSS chunk is still produced by a production build even though
every `/design-system` route calls `notFound()` outside development. The routes
emit no paths and no laboratory markup ships, but the stylesheet exists in the
build output. Removing it entirely would need the route files to be absent from
a production build.

## Dark mode

Untitled UI's dark mode is a `dark-mode` class, declared as a custom variant.
`LabThemeProvider` puts it on the **document element**, not on a laboratory
container, because React Aria portals popovers, menus, modals and tooltips to
`document.body`. Scoping the class to a container left every overlay rendering
in light mode over a dark page.

The class is applied after hydration and removed on unmount, so it never
diverges from the server HTML and never leaks to another route. The stored
choice is read through `useSyncExternalStore` with a `"system"` server snapshot.

## Conventions

- Every displayed interaction works. No inert buttons, no static pickers, no
  notification that cannot be dismissed.
- Every family shows the states it can reach: hover, pressed, focus-visible,
  disabled, loading, invalid, empty and error.
- Content is real ANU material. No generic SaaS placeholder copy.
- Families with alternatives (tables, metrics) offer a switcher over shared
  state, so the choice is about appearance rather than capability.

## Navigation shells

Untitled UI's sidebars position themselves with `lg:fixed`, so they escape any
container and can only be judged at full page size. `/design-system/preview/[shell]`
renders each one as a real page, and the navigation section frames those routes
in an iframe with a width switcher.

## Running the gate

`npm run verify` runs two production builds, which fight a running dev server
over `.next`. To keep port 3000 alive, run the builds in a copy:

```bash
rsync -a --exclude .git --exclude .next --exclude node_modules . /tmp/verify-copy/
ln -s "$PWD/node_modules" /tmp/verify-copy/node_modules
cd /tmp/verify-copy && npm run check && npm test
```
