import { Star01 } from "@untitledui/icons";
import { Example, Grid, Stack, Variants } from "../section-frame";

const brandRamp: ReadonlyArray<{ step: string; className: string }> = [
  { step: "50", className: "bg-brand-50" },
  { step: "100", className: "bg-brand-100" },
  { step: "200", className: "bg-brand-200" },
  { step: "300", className: "bg-brand-300" },
  { step: "400", className: "bg-brand-400" },
  { step: "500", className: "bg-brand-500" },
  { step: "600", className: "bg-brand-600" },
  { step: "700", className: "bg-brand-700" },
  { step: "800", className: "bg-brand-800" },
  { step: "900", className: "bg-brand-900" },
  { step: "950", className: "bg-brand-950" },
];

const neutralRamp: ReadonlyArray<{ step: string; className: string }> = [
  { step: "50", className: "bg-neutral-50" },
  { step: "100", className: "bg-neutral-100" },
  { step: "200", className: "bg-neutral-200" },
  { step: "300", className: "bg-neutral-300" },
  { step: "400", className: "bg-neutral-400" },
  { step: "500", className: "bg-neutral-500" },
  { step: "600", className: "bg-neutral-600" },
  { step: "700", className: "bg-neutral-700" },
  { step: "800", className: "bg-neutral-800" },
  { step: "900", className: "bg-neutral-900" },
  { step: "950", className: "bg-neutral-950" },
];

/** Literal utility classes so Tailwind emits the variables it would otherwise tree-shake. */
const utilityRamps: ReadonlyArray<{
  label: string;
  swatches: ReadonlyArray<{ step: string; className: string }>;
}> = [
  {
    label: "Brand",
    swatches: [
      { step: "50", className: "bg-utility-brand-50" },
      { step: "100", className: "bg-utility-brand-100" },
      { step: "200", className: "bg-utility-brand-200" },
      { step: "300", className: "bg-utility-brand-300" },
      { step: "400", className: "bg-utility-brand-400" },
      { step: "500", className: "bg-utility-brand-500" },
      { step: "600", className: "bg-utility-brand-600" },
      { step: "700", className: "bg-utility-brand-700" },
    ],
  },
  {
    label: "Neutral",
    swatches: [
      { step: "50", className: "bg-utility-neutral-50" },
      { step: "100", className: "bg-utility-neutral-100" },
      { step: "200", className: "bg-utility-neutral-200" },
      { step: "300", className: "bg-utility-neutral-300" },
      { step: "400", className: "bg-utility-neutral-400" },
      { step: "500", className: "bg-utility-neutral-500" },
      { step: "600", className: "bg-utility-neutral-600" },
      { step: "700", className: "bg-utility-neutral-700" },
    ],
  },
  {
    label: "Success",
    swatches: [
      { step: "50", className: "bg-utility-green-50" },
      { step: "100", className: "bg-utility-green-100" },
      { step: "200", className: "bg-utility-green-200" },
      { step: "300", className: "bg-utility-green-300" },
      { step: "400", className: "bg-utility-green-400" },
      { step: "500", className: "bg-utility-green-500" },
      { step: "600", className: "bg-utility-green-600" },
      { step: "700", className: "bg-utility-green-700" },
    ],
  },
  {
    label: "Warning",
    swatches: [
      { step: "50", className: "bg-utility-yellow-50" },
      { step: "100", className: "bg-utility-yellow-100" },
      { step: "200", className: "bg-utility-yellow-200" },
      { step: "300", className: "bg-utility-yellow-300" },
      { step: "400", className: "bg-utility-yellow-400" },
      { step: "500", className: "bg-utility-yellow-500" },
      { step: "600", className: "bg-utility-yellow-600" },
      { step: "700", className: "bg-utility-yellow-700" },
    ],
  },
  {
    label: "Error",
    swatches: [
      { step: "50", className: "bg-utility-red-50" },
      { step: "100", className: "bg-utility-red-100" },
      { step: "200", className: "bg-utility-red-200" },
      { step: "300", className: "bg-utility-red-300" },
      { step: "400", className: "bg-utility-red-400" },
      { step: "500", className: "bg-utility-red-500" },
      { step: "600", className: "bg-utility-red-600" },
      { step: "700", className: "bg-utility-red-700" },
    ],
  },
  {
    label: "Information",
    swatches: [
      { step: "50", className: "bg-utility-blue-50" },
      { step: "100", className: "bg-utility-blue-100" },
      { step: "200", className: "bg-utility-blue-200" },
      { step: "300", className: "bg-utility-blue-300" },
      { step: "400", className: "bg-utility-blue-400" },
      { step: "500", className: "bg-utility-blue-500" },
      { step: "600", className: "bg-utility-blue-600" },
      { step: "700", className: "bg-utility-blue-700" },
    ],
  },
  {
    label: "Indigo",
    swatches: [
      { step: "50", className: "bg-utility-indigo-50" },
      { step: "100", className: "bg-utility-indigo-100" },
      { step: "200", className: "bg-utility-indigo-200" },
      { step: "300", className: "bg-utility-indigo-300" },
      { step: "400", className: "bg-utility-indigo-400" },
      { step: "500", className: "bg-utility-indigo-500" },
      { step: "600", className: "bg-utility-indigo-600" },
      { step: "700", className: "bg-utility-indigo-700" },
    ],
  },
  {
    label: "Orange",
    swatches: [
      { step: "50", className: "bg-utility-orange-50" },
      { step: "100", className: "bg-utility-orange-100" },
      { step: "200", className: "bg-utility-orange-200" },
      { step: "300", className: "bg-utility-orange-300" },
      { step: "400", className: "bg-utility-orange-400" },
      { step: "500", className: "bg-utility-orange-500" },
      { step: "600", className: "bg-utility-orange-600" },
      { step: "700", className: "bg-utility-orange-700" },
    ],
  },
];

const textRoles = [
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "text-quaternary",
  "text-placeholder",
  "text-brand-primary",
  "text-brand-secondary",
  "text-brand-tertiary",
  "text-error-primary",
  "text-warning-primary",
  "text-success-primary",
];

const bgRoles = [
  "bg-primary",
  "bg-secondary",
  "bg-tertiary",
  "bg-quaternary",
  "bg-brand-primary",
  "bg-brand-secondary",
  "bg-brand-solid",
  "bg-error-primary",
  "bg-error-solid",
  "bg-warning-primary",
  "bg-warning-solid",
  "bg-success-primary",
  "bg-success-solid",
  "bg-primary-solid",
];

const lineRoles = [
  { label: "border-primary", className: "border-primary" },
  { label: "border-secondary", className: "border-secondary" },
  { label: "border-tertiary", className: "border-tertiary" },
  { label: "border-brand", className: "border-brand" },
  { label: "border-error", className: "border-error" },
];

const fgRoles = [
  { label: "fg-primary", className: "text-fg-primary" },
  { label: "fg-secondary", className: "text-fg-secondary" },
  { label: "fg-tertiary", className: "text-fg-tertiary" },
  { label: "fg-quaternary", className: "text-fg-quaternary" },
  { label: "fg-brand-primary", className: "text-fg-brand-primary" },
  { label: "fg-brand-secondary", className: "text-fg-brand-secondary" },
  { label: "fg-error-primary", className: "text-fg-error-primary" },
  { label: "fg-warning-primary", className: "text-fg-warning-primary" },
  { label: "fg-success-primary", className: "text-fg-success-primary" },
];

function Swatch({
  className,
  label,
  sub,
}: {
  className: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`h-16 w-full rounded-lg ring-1 ring-secondary_alt ring-inset ${className}`}
      />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-secondary">{label}</span>
        {sub && (
          <span className="font-mono text-xs text-quaternary">{sub}</span>
        )}
      </div>
    </div>
  );
}

export function FoundationsSection() {
  return (
    <Stack>
      <Example
        title="Brand ramp"
        description="Coursemap's violet, substituted into Untitled UI's eleven-step brand ramp. Every semantic brand role below derives from these values."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
          {brandRamp.map((swatch) => (
            <Swatch
              key={swatch.step}
              className={swatch.className}
              label={swatch.step}
              sub={swatch.className}
            />
          ))}
        </div>
      </Example>

      <Example
        title="Neutral ramp"
        description="Untitled UI derives every grey role from Tailwind's neutral scale. Unchanged from upstream."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
          {neutralRamp.map((swatch) => (
            <Swatch
              key={swatch.step}
              className={swatch.className}
              label={swatch.step}
              sub={swatch.className}
            />
          ))}
        </div>
      </Example>

      <Example
        title="Utility ramps"
        description="Utility colours invert step by step in dark mode, so a utility-500 keeps its meaning in both themes. Switch the theme above to see the inversion."
      >
        <div className="flex flex-col gap-5">
          {utilityRamps.map((ramp) => (
            <div key={ramp.label} className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">
                {ramp.label}
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {ramp.swatches.map((swatch) => (
                  <div key={swatch.step} className="flex flex-col gap-1">
                    <div
                      className={`h-10 w-full rounded-md ring-1 ring-secondary_alt ring-inset ${swatch.className}`}
                    />
                    <span className="font-mono text-xs text-quaternary">
                      {swatch.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Background roles"
        description="Surfaces are addressed by role, never by ramp step, so the same markup works in both themes."
      >
        <Grid cols={4}>
          {bgRoles.map((role) => (
            <div key={role} className="flex flex-col gap-1.5">
              <div
                className={`h-16 w-full rounded-lg ring-1 ring-secondary ring-inset ${role}`}
              />
              <span className="font-mono text-xs text-secondary">{role}</span>
            </div>
          ))}
        </Grid>
      </Example>

      <Example
        title="Text roles"
        description="Text colours carry hierarchy. Primary for content, tertiary for supporting copy, quaternary for metadata."
      >
        <div className="flex flex-col gap-3">
          {textRoles.map((role) => (
            <div
              key={role}
              className="flex flex-wrap items-baseline justify-between gap-3 border-b border-secondary pb-3 last:border-0 last:pb-0"
            >
              <span className={`text-md font-medium ${role}`}>
                COMP1100 Programming as Problem Solving
              </span>
              <span className="font-mono text-xs text-quaternary">{role}</span>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Foreground and border roles"
        description="Foreground roles colour icons and glyphs. Border roles colour dividers, control outlines and focus rings."
      >
        <div className="flex flex-col gap-6">
          <Variants label="Foreground">
            {fgRoles.map((role) => (
              <div key={role.label} className="flex items-center gap-2">
                <Star01 className={`size-5 ${role.className}`} />
                <span className="font-mono text-xs text-secondary">
                  {role.label}
                </span>
              </div>
            ))}
          </Variants>

          <Variants label="Borders">
            {lineRoles.map((line) => (
              <div key={line.label} className="flex flex-col gap-1.5">
                <div
                  className={`h-10 w-40 rounded-lg border-2 ${line.className}`}
                />
                <span className="font-mono text-xs text-secondary">
                  {line.label}
                </span>
              </div>
            ))}
          </Variants>
        </div>
      </Example>

      <Example
        title="Focus ring"
        description="Every interactive component uses a two-pixel offset outline in the brand colour. Tab into these to compare."
      >
        <Variants>
          <button
            type="button"
            className="rounded-lg bg-brand-solid px-3.5 py-2.5 text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Brand focus ring
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-secondary ring-1 ring-primary outline-focus-ring ring-inset focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Secondary focus ring
          </button>
          <button
            type="button"
            className="rounded-lg bg-error-solid px-3.5 py-2.5 text-sm font-semibold text-white outline-focus-ring-error focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Error focus ring
          </button>
        </Variants>
      </Example>
    </Stack>
  );
}
