"use client";

import { Breadcrumbs } from "@/components/design-system/coursemap/breadcrumbs";
import { Example, FidelityNote, Stack } from "../section-frame";

const shortTrail = [
  { id: "plan", label: "Plan", href: "#" },
  { id: "2026", label: "2026", href: "#" },
  { id: "s1", label: "Semester 1" },
];

const longTrail = [
  { id: "catalogue", label: "Catalogue", href: "#" },
  { id: "cecs", label: "Engineering and Computer Science", href: "#" },
  { id: "computing", label: "Computing", href: "#" },
  { id: "undergraduate", label: "Undergraduate", href: "#" },
  { id: "comp1100", label: "COMP1100", href: "#" },
  { id: "rules", label: "Requisite rules" },
];

export function BreadcrumbsSection() {
  return (
    <Stack>
      <FidelityNote>
        Untitled UI&rsquo;s breadcrumb component is PRO-only, so this is built
        here from the free Dropdown primitive and the same semantic tokens the
        navigation items use. The overflow menu is a real, keyboard-operable
        Untitled dropdown.
      </FidelityNote>

      <Example
        title="Short trail"
        description="Every step visible. The current page is not a link and carries aria-current."
      >
        <Breadcrumbs items={shortTrail} />
      </Example>

      <Example
        title="Without the home icon"
        description="For contexts that already sit inside a titled panel."
      >
        <Breadcrumbs items={shortTrail} showHome={false} />
      </Example>

      <Example
        title="Collapsed trail"
        description="Past four steps the middle collapses into a menu. Open it to reach the hidden steps with the keyboard."
      >
        <Breadcrumbs items={longTrail} />
      </Example>

      <Example
        title="In a page header"
        description="The pattern as it would sit above a course page."
      >
        <div className="flex flex-col gap-4">
          <Breadcrumbs items={longTrail} />
          <div className="flex flex-col gap-1">
            <h2 className="text-display-xs font-semibold text-primary">
              COMP1100 Programming as Problem Solving
            </h2>
            <p className="text-md text-tertiary">
              6 units &middot; Semester 1, 2026 &middot; Engineering and
              Computer Science
            </p>
          </div>
        </div>
      </Example>
    </Stack>
  );
}
