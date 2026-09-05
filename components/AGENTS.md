# Component conventions

- Use semantic HTML and native controls before adding ARIA.
- Build shared primitives in `components/ui` using the pinned shadcn and Radix conventions.
- Import primitives from concrete modules such as `@/components/ui/button`.
- Review shadcn dry-run output before writing files and never overwrite a customised primitive blindly.
- Use Lucide for interface icons and include an accessible name where an icon has meaning.
- Dialogs, sheets, menus, popovers and tooltips must support keyboard navigation, focus return and Escape.
- Course states must include text or icon meaning in addition to colour.
- Keep domain calculations outside presentational components.
- Keep client components as small as the interaction requires.
- Verify desktop, mobile, keyboard, empty, loading and error states for material UI changes.

## Marketing and auth surfaces

- Landing, auth and onboarding pages use a white canvas with pastel accent tints from the default Tailwind palette (sky, amber, emerald, rose and the brand violet scale) and large radii.
- `cn` does not dedupe conflicting utilities, so shape or colour overrides on `Button` and `ButtonLink` need the important modifier, for example `!rounded-full`.
- Decorative product mock-ups are CSS-only, marked `aria-hidden="true"` and never carry meaning that is missing from nearby text.

## Copy

- Do not add a visible page title that only repeats the sidebar or breadcrumb label, and do not follow it with a subtitle that restates the filter and the row count. Use a screen-reader-only `h1` and let the content carry the meaning.
- Do not add explainer sections describing how the product works to the people who operate it, and do not give a card a description that paraphrases its own title.
- Every line of interface copy must tell the reader something the surrounding interface does not already show. Delete the rest.
- Use `FilterBar` above a list for search and filtering rather than building controls into the table, so every list behaves the same way.

## Shape

- Corner radius, shadows, the type scale and the semantic colour roles come from the Untitled UI theme, vendored at `components/design-system/untitled/styles/theme.css` and imported by `app/globals.css`. Coursemap's earlier, tighter radius scale was retired in favour of it.
- Reshape the app by changing a token, never with a pile of per-component overrides. Do not edit the vendored theme except for the brand ramp, which is already substituted; see `docs/design-system/provenance.md`.
- Prefer semantic roles over raw palette steps: `bg-primary`, `text-tertiary`, `border-secondary`, `bg-brand-solid`, `ring-error_subtle`. They carry a dark-mode value; `zinc-500` does not.
- Keep `rounded-full` for genuinely circular things only: avatars, status dots and pills.

## Untitled UI components

- `/design-system` is the reference implementation. Compare against it before inventing a pattern.
- Vendored components are imported through the `@uui/*` alias. They are third-party MIT source and are excluded from Prettier and ESLint so they stay byte-comparable with upstream.
- `components/design-system/coursemap/` holds the families Untitled UI keeps behind PRO, rebuilt from the free primitives.
- React Aria portals overlays to `document.body`. Anything that themes a subtree must account for that.
