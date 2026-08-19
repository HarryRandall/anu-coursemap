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
