import { Example, Stack } from "../section-frame";

const spacingSteps = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

const radii = [
  "rounded-xs",
  "rounded-sm",
  "rounded-md",
  "rounded-lg",
  "rounded-xl",
  "rounded-2xl",
  "rounded-3xl",
  "rounded-4xl",
  "rounded-full",
];

const shadows = [
  { className: "shadow-xs", label: "shadow-xs" },
  { className: "shadow-sm", label: "shadow-sm" },
  { className: "shadow-md", label: "shadow-md" },
  { className: "shadow-lg", label: "shadow-lg" },
  { className: "shadow-xl", label: "shadow-xl" },
  { className: "shadow-2xl", label: "shadow-2xl" },
  { className: "shadow-3xl", label: "shadow-3xl" },
  {
    className: "shadow-xs-skeuomorphic",
    label: "shadow-xs-skeuomorphic",
  },
];

export function SpacingSection() {
  return (
    <Stack>
      <Example
        title="Spacing rhythm"
        description="Untitled UI works on a 4px base. Every gap, padding and control height is a multiple of it."
      >
        <div className="flex flex-col gap-3">
          {spacingSteps.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <span className="text-quaternary w-16 shrink-0 font-mono text-xs">
                {step}
              </span>
              <span className="text-tertiary w-16 shrink-0 text-xs">
                {step * 4}px
              </span>
              <div
                className="bg-brand-solid h-3 rounded-sm"
                style={{ width: `calc(var(--spacing) * ${step})` }}
              />
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Radius scale"
        description="The laboratory uses Tailwind's default radius scale, which is what Untitled UI's components are drawn against. Coursemap's production scale is deliberately tighter and is untouched by this route."
      >
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          {radii.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-2">
              <div
                className={`bg-brand-primary ring-brand size-16 ring-1 ring-inset ${radius}`}
              />
              <span className="text-quaternary text-center font-mono text-xs">
                {radius.replace("rounded-", "")}
              </span>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Elevation"
        description="Shadows are pure elevation. The skeuomorphic variant adds the inset hairline that Untitled UI's solid buttons use."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shadows.map((shadow) => (
            <div key={shadow.label} className="flex flex-col gap-2">
              <div
                className={`flex h-24 items-center justify-center rounded-xl bg-primary ${shadow.className}`}
              >
                <span className="text-tertiary text-xs">Surface</span>
              </div>
              <span className="text-quaternary font-mono text-xs">
                {shadow.label}
              </span>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Container widths"
        description="Untitled UI's application container is 1280px. Below the xs breakpoint at 600px the laboratory collapses to a single column."
      >
        <div className="text-tertiary flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between border-b border-secondary pb-3">
            <span className="font-mono text-xs">--breakpoint-xxs</span>
            <span>320px</span>
          </div>
          <div className="flex items-center justify-between border-b border-secondary pb-3">
            <span className="font-mono text-xs">--breakpoint-xs</span>
            <span>600px</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs">--max-width-container</span>
            <span>1280px</span>
          </div>
        </div>
      </Example>
    </Stack>
  );
}
