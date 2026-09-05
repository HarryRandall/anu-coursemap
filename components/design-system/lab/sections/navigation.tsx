"use client";

import { useState } from "react";
import { Monitor01, Phone01, Tablet01 } from "@untitledui/icons";
import {
  ButtonGroup,
  ButtonGroupItem,
} from "@uui/components/base/button-group/button-group";
import { Button } from "@uui/components/base/buttons/button";
import { shellIds, shellLabels } from "../shells";
import { useLabTheme } from "../lab-theme-provider";
import { Example, FidelityNote, Stack } from "../section-frame";

const widths = {
  mobile: 390,
  tablet: 834,
  desktop: 1280,
} as const;

type Width = keyof typeof widths;

function ShellFrame({ shell }: { shell: (typeof shellIds)[number] }) {
  const { resolved } = useLabTheme();
  const [width, setWidth] = useState<Set<string>>(() => new Set(["desktop"]));
  const current = ([...width][0] ?? "desktop") as Width;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonGroup
          size="sm"
          selectedKeys={width}
          onSelectionChange={(keys) => {
            const next = new Set([...keys].map(String));
            if (next.size > 0) setWidth(next);
          }}
        >
          <ButtonGroupItem id="mobile" iconLeading={Phone01}>
            390
          </ButtonGroupItem>
          <ButtonGroupItem id="tablet" iconLeading={Tablet01}>
            834
          </ButtonGroupItem>
          <ButtonGroupItem id="desktop" iconLeading={Monitor01}>
            1280
          </ButtonGroupItem>
        </ButtonGroup>

        <Button
          size="sm"
          color="link-color"
          href={`/design-system/preview/${shell}?theme=${resolved}`}
          target="_blank"
        >
          Open full page
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-secondary">
        <iframe
          key={`${shell}-${resolved}`}
          title={shellLabels[shell].title}
          src={`/design-system/preview/${shell}?theme=${resolved}`}
          style={{ width: widths[current] }}
          className="h-160 max-w-none border-0 bg-primary"
        />
      </div>
    </div>
  );
}

export function NavigationSection() {
  return (
    <Stack>
      <FidelityNote>
        Untitled UI&rsquo;s sidebars position themselves with{" "}
        <code className="font-mono">lg:fixed</code>, so they only behave
        correctly as a whole page. Each shell below is the real component
        rendered at full size in a frame, not a shrunken copy. Switch the frame
        width to watch it collapse to its mobile header.
      </FidelityNote>

      {shellIds.map((shell) => (
        <Example
          key={shell}
          bare
          title={shellLabels[shell].title}
          description={shellLabels[shell].summary}
        >
          <ShellFrame shell={shell} />
        </Example>
      ))}
    </Stack>
  );
}
