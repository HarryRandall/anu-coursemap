import { Example, Stack } from "../section-frame";

const displayScale = [
  { className: "text-display-2xl", label: "Display 2xl", size: "72 / 90" },
  { className: "text-display-xl", label: "Display xl", size: "60 / 72" },
  { className: "text-display-lg", label: "Display lg", size: "48 / 60" },
  { className: "text-display-md", label: "Display md", size: "36 / 44" },
  { className: "text-display-sm", label: "Display sm", size: "30 / 38" },
  { className: "text-display-xs", label: "Display xs", size: "24 / 32" },
];

const textScale = [
  { className: "text-xl", label: "Text xl", size: "20 / 30" },
  { className: "text-lg", label: "Text lg", size: "18 / 28" },
  { className: "text-md", label: "Text md", size: "16 / 24" },
  { className: "text-sm", label: "Text sm", size: "14 / 20" },
  { className: "text-xs", label: "Text xs", size: "12 / 18" },
];

const weights = [
  { className: "font-normal", label: "Regular 400" },
  { className: "font-medium", label: "Medium 500" },
  { className: "font-semibold", label: "Semibold 600" },
  { className: "font-bold", label: "Bold 700" },
];

export function TypographySection() {
  return (
    <Stack>
      <Example
        title="Display scale"
        description="Display sizes carry negative letter spacing from display-md upwards. Used for page and section titles only."
      >
        <div className="flex flex-col gap-6">
          {displayScale.map((entry) => (
            <div
              key={entry.className}
              className="flex flex-col gap-1 border-b border-secondary pb-6 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-quaternary font-mono text-xs">
                  {entry.className}
                </span>
                <span className="text-quaternary text-xs">{entry.size}</span>
              </div>
              <p className={`${entry.className} font-semibold text-primary`}>
                Your ANU degree, mapped
              </p>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Text scale"
        description="Body sizes. Interface controls use text-sm; long-form content uses text-md."
      >
        <div className="flex flex-col gap-5">
          {textScale.map((entry) => (
            <div
              key={entry.className}
              className="flex flex-col gap-1 border-b border-secondary pb-5 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-quaternary font-mono text-xs">
                  {entry.className}
                </span>
                <span className="text-quaternary text-xs">{entry.size}</span>
              </div>
              <p className={`${entry.className} text-tertiary`}>
                COMP2100 Software Design Methodologies requires COMP1110 and is
                offered in Semester 1.
              </p>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Weights"
        description="Inter Variable, self-hosted. Semibold carries every control label and heading."
      >
        <div className="flex flex-col gap-4">
          {weights.map((weight) => (
            <div key={weight.className} className="flex flex-col gap-0.5">
              <span className="text-quaternary font-mono text-xs">
                {weight.className}
              </span>
              <p className={`text-xl text-primary ${weight.className}`}>
                Bachelor of Advanced Computing (Honours)
              </p>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Monospace"
        description="Course codes, unit counts and identifiers use the mono stack so they align in tables."
      >
        <div className="flex flex-col gap-2 font-mono text-sm text-secondary">
          <span>COMP1100 &middot; 6 units &middot; Semester 1, 2026</span>
          <span>MATH1013 &middot; 6 units &middot; Semester 1, 2026</span>
          <span>ENGN2218 &middot; 6 units &middot; Semester 2, 2026</span>
        </div>
      </Example>

      <Example
        title="Prose"
        description="The upstream typography.css maps prose to the semantic text roles, so long-form help content inherits the theme."
      >
        <div className="prose max-w-none">
          <h2>Understanding prerequisites</h2>
          <p>
            A prerequisite is a course you must complete before you can enrol in
            another. Coursemap reads the published requisite rule for each
            course and shows you which of your completed courses satisfy it.
          </p>
          <ul>
            <li>Completed courses satisfy a rule immediately.</li>
            <li>Enrolled courses satisfy a rule provisionally.</li>
            <li>Planned courses are checked against your intended sequence.</li>
          </ul>
          <blockquote>
            <p>
              A rule that cannot be satisfied in any remaining session is
              reported as a blocked path, not as a warning.
            </p>
          </blockquote>
        </div>
      </Example>
    </Stack>
  );
}
