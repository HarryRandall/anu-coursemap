# ReUI components

Coursemap uses the Radix ReUI source at upstream commit
`8a2c701eaf95729f238274d5ce2555a5a8bd23e7` (v2.5.2), from the official
[ReUI repository](https://github.com/keenthemes/reui). The MIT licence is
preserved in `LICENSE.md`.

`ui/` holds the required shadcn primitives; `components/` holds the required
extended ReUI components. Hooks and utilities are retained only when these
components need them. Import through the `@reui` alias. There are no demo
catalogues or component reference routes.

Use ReUI defaults and the Nova stylesheet. `app/globals.css` owns Coursemap's
brand and theme values. `theme.css` maps tokens and adapts Radix state attributes
to the Nova stylesheet. `icon-placeholder.tsx` resolves upstream icon names to
Lucide. Calendar compatibility adjustments support our existing dependency
versions.

## Adding or updating a component

Copy only the required public Radix component and its dependencies from the
pinned official revision, or review a deliberate upstream version update first.
Rewrite upstream imports to concrete `@reui/ui`, `@reui/components`,
`@reui/hooks` and `@reui/lib` modules. Preserve the licence and upstream
formatting; document any compatibility changes. Never import the full registry
or its examples. Run `npm run verify` and check the affected product flow in a
browser after changing retained source or dependencies.
