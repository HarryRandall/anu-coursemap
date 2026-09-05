# Component inventory

Source key: **MIT** is vendored verbatim from `untitleduico/react`, edited only
for import prefix. **Adapted** is built in `components/design-system/coursemap/`
because the upstream component is PRO-only. **Tokens** is the theme itself.

| Family                  | Source  | Upstream path                                           | Notes                                                                            |
| ----------------------- | ------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Foundations             | Tokens  | `styles/theme.css`                                      | Brand ramp substituted for Coursemap violet. Everything else untouched.          |
| Typography              | Tokens  | `styles/theme.css`, `styles/typography.css`             | Inter Variable, self-hosted.                                                     |
| Spacing and elevation   | Tokens  | `styles/theme.css`                                      | Tailwind's default radius scale, which is what the components are drawn against. |
| Buttons                 | MIT     | `base/buttons/button.tsx`                               | Five sizes, nine colours, link and destructive variants.                         |
| Button groups           | MIT     | `base/button-group/`, `base/buttons/button-utility.tsx` | Includes close and utility buttons.                                              |
| Badges and tags         | MIT     | `base/badges/`, `base/tags/`                            | Twelve colours, three types, badge groups, dismissible and selectable tags.      |
| Avatars                 | MIT     | `base/avatar/`                                          | Six sizes, status, verification, counts and label groups.                        |
| Inputs                  | MIT     | `base/input/`                                           | Includes input groups and the pin input.                                         |
| Textareas               | MIT     | `base/textarea/`                                        |                                                                                  |
| Selects                 | MIT     | `base/select/select.tsx`, `select-native.tsx`           |                                                                                  |
| Combobox                | MIT     | `base/select/combobox.tsx`                              |                                                                                  |
| Multi-select            | MIT     | `base/select/multi-select.tsx`, `tag-select.tsx`        |                                                                                  |
| Checkbox, radio, toggle | MIT     | `base/checkbox/`, `base/radio-buttons/`, `base/toggle/` |                                                                                  |
| Slider                  | MIT     | `base/slider/`                                          |                                                                                  |
| Tooltips                | MIT     | `base/tooltip/`                                         | `TooltipTrigger` is itself the button; it must wrap non-interactive content.     |
| Dropdown menus          | MIT     | `base/dropdown/`                                        | Sections, shortcuts, checkbox and radio indicators.                              |
| Progress indicators     | MIT     | `base/progress-indicators/`                             | Bars, circles and half circles.                                                  |
| Tabs                    | MIT     | `application/tabs/`                                     | Five horizontal types plus the vertical line type.                               |
| Pagination              | MIT     | `application/pagination/`                               | Page numbers, card footers and dots.                                             |
| Date and range pickers  | MIT     | `application/date-picker/`                              | Real calendars with presets.                                                     |
| File upload             | MIT     | `application/file-upload/`                              | Dropzone, progress, failure and retry.                                           |
| Modals                  | MIT     | `application/modals/`                                   |                                                                                  |
| Drawers                 | MIT     | `application/slideout-menus/`                           |                                                                                  |
| Empty states            | MIT     | `application/empty-state/`                              | Background patterns need a clipping context from the caller.                     |
| Loading indicators      | MIT     | `application/loading-indicator/`                        |                                                                                  |
| Tables                  | MIT     | `application/table/`                                    | Sorting and selection are built in.                                              |
| Charts                  | MIT     | `application/charts/charts-base.tsx`                    | Tooltip and legend over Recharts.                                                |
| Navigation shells       | MIT     | `application/app-navigation/`                           | Five sidebars and header navigation. Previewed full page; they use `lg:fixed`.   |
| Breadcrumbs             | Adapted | none                                                    | Built from the free Dropdown for the overflow menu.                              |
| Alerts                  | Adapted | none                                                    | Three tones. Avoids `bg-*-primary`, which is a saturated fill in dark mode.      |
| Notifications           | Adapted | none                                                    | Card built from free primitives; Sonner supplies queue, timing and swipe.        |
| Skeletons               | Adapted | none                                                    | Shaped to the real components so nothing shifts on load.                         |
| Metric cards            | Adapted | none                                                    | Six anatomies: figure, trend, progress, breakdown, gauge, comparison.            |
| Filter bar              | Adapted | PRO (`application/filter-bar`)                          | Built from Input, Select, MultiSelect and Button.                                |
| Table variants          | Adapted | none                                                    | Five anatomies over the vendored table and the same tokens.                      |
| Course glyph            | Adapted | none                                                    | Subject-area icon derived from the course code prefix, on utility ramps.         |
| Coursemap cards         | Adapted | none                                                    | Course, programme and requirement cards from vendored primitives.                |

## Not vendored

Free components that exist upstream but the laboratory does not currently show:
app store buttons, social buttons and logos, carousel, credit card, QR code,
payment icons, integration icons, rating stars and badge, iPhone mockup,
`hook-form`, `input-payment`, `input-number`, `input-date`, `input-file`,
`input-tags`, and the chart demo variants (`bar-charts`, `line-charts`,
`pie-charts`, `radar-charts`, `activity-gauges`, `progress-circles` demos).
None are blocked; they were out of scope for this pass.

## Migration status

Nothing has moved into `components/ui` and no production screen has changed.
The vendored tree is the source for that migration when a family is approved.
