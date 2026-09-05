"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight, DotsHorizontal, Home01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { Dropdown } from "@uui/components/base/dropdown/dropdown";
import { cx } from "@uui/utils/cx";

/**
 * Adapted. Untitled UI's breadcrumb component is PRO-only. This follows the
 * geometry of the free navigation items and uses the same semantic tokens,
 * with the free Dropdown supplying the overflow menu.
 */

export type Crumb = { id: string; label: string; href?: string };

const linkClass =
  "rounded-sm px-0.5 text-sm font-semibold text-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2";

type Step =
  | { kind: "link"; crumb: Crumb }
  | { kind: "current"; crumb: Crumb }
  | { kind: "overflow"; hidden: Crumb[] };

function buildSteps(items: Crumb[], maxVisible: number): Step[] {
  if (items.length === 0) return [];

  const last = items[items.length - 1];

  if (items.length <= maxVisible) {
    return items.map<Step>((crumb) =>
      crumb === last ? { kind: "current", crumb } : { kind: "link", crumb },
    );
  }

  return [
    { kind: "link", crumb: items[0] },
    { kind: "overflow", hidden: items.slice(1, -2) },
    { kind: "link", crumb: items[items.length - 2] },
    { kind: "current", crumb: last },
  ];
}

function Separator() {
  return (
    <li aria-hidden="true" className="flex items-center">
      <ChevronRight className="size-4 text-fg-quaternary" />
    </li>
  );
}

export function Breadcrumbs({
  items,
  maxVisible = 4,
  showHome = true,
  className,
}: {
  items: Crumb[];
  /** Collapse the middle of the trail once it exceeds this many items. */
  maxVisible?: number;
  showHome?: boolean;
  className?: string;
}) {
  const steps = buildSteps(items, maxVisible);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {showHome && (
          <>
            <li className="flex items-center">
              <Link
                href="/design-system"
                aria-label="Home"
                className={linkClass}
              >
                <Home01 className="size-5" />
              </Link>
            </li>
            {steps.length > 0 && <Separator />}
          </>
        )}

        {steps.map((step, index) => (
          <Fragment key={step.kind === "overflow" ? "overflow" : step.crumb.id}>
            <li className="flex items-center">
              {step.kind === "current" && (
                <span
                  aria-current="page"
                  className="rounded-sm bg-secondary px-2 py-0.5 text-sm font-semibold text-secondary"
                >
                  {step.crumb.label}
                </span>
              )}

              {step.kind === "link" && (
                <a href={step.crumb.href ?? "#"} className={linkClass}>
                  {step.crumb.label}
                </a>
              )}

              {step.kind === "overflow" && (
                <Dropdown.Root>
                  <AriaButton
                    aria-label={`Show ${step.hidden.length} hidden steps`}
                    className={cx(
                      linkClass,
                      "flex cursor-pointer items-center",
                    )}
                  >
                    <DotsHorizontal className="size-5" />
                  </AriaButton>
                  <Dropdown.Popover className="w-min">
                    <Dropdown.Menu>
                      {step.hidden.map((crumb) => (
                        <Dropdown.Item
                          key={crumb.id}
                          id={crumb.id}
                          href={crumb.href}
                        >
                          <span className="whitespace-nowrap">
                            {crumb.label}
                          </span>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown.Root>
              )}
            </li>

            {index < steps.length - 1 && <Separator />}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
