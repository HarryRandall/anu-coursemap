"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  Monitor01,
  Moon01,
  Sun,
  X as CloseIcon,
  Menu02,
} from "@untitledui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from "react-aria-components";
import { NavList } from "@uui/components/application/app-navigation/base-components/nav-list";
import type { NavItemType } from "@uui/components/application/app-navigation/config";
import { Badge } from "@uui/components/base/badges/badges";
import { cx } from "@uui/utils/cx";
import { useLabTheme } from "./lab-theme-provider";
import {
  labGroups,
  labSectionHref,
  labSections,
  reuiCatalogueNavSections,
  reviewCatalogueNavSections,
  sourceLabels,
} from "./nav";

type ThemeChoice = "light" | "dark" | "system";

const themeChoices: ReadonlyArray<{
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon01 },
  { value: "system", label: "System", icon: Monitor01 },
];

function ThemeSwitch() {
  const { theme, setTheme, mounted } = useLabTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg bg-secondary p-1 ring-1 ring-secondary ring-inset"
    >
      {themeChoices.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cx(
              "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2",
              selected
                ? "bg-primary text-secondary shadow-xs ring-1 ring-primary ring-inset"
                : "text-quaternary hover:text-secondary",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="max-lg:hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LabMark() {
  return (
    <Link
      href="/design-system"
      className="flex items-center gap-2.5 rounded-md outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-solid text-sm font-bold text-white"
      >
        C
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-primary">Coursemap</span>
        <span className="text-xs text-tertiary">Component laboratory</span>
      </span>
    </Link>
  );
}

function navItems(activeSlug: string): NavItemType[] {
  const items: NavItemType[] = [];

  for (const group of labGroups) {
    const sections =
      group === "Review"
        ? reviewCatalogueNavSections
        : group === "ReUI components"
          ? reuiCatalogueNavSections
          : labSections.filter((section) => section.group === group);
    if (sections.length === 0) continue;

    items.push({
      label: group,
      href: `#${group}`,
      items: sections.map((section) => ({
        label: section.title,
        href: labSectionHref(section),
        badge:
          section.source === "review" ? (
            <Badge size="sm" type="pill-color" color="brand">
              Review
            </Badge>
          ) : section.source === "adapted" ? (
            <Badge size="sm" type="pill-color" color="warning">
              Adapted
            </Badge>
          ) : section.source === "reui" ? (
            <Badge size="sm" type="pill-color" color="brand">
              ReUI
            </Badge>
          ) : undefined,
      })),
    });
  }

  void activeSlug;
  return items;
}

function SidebarBody({
  activeSlug,
  activeHref,
  onNavigate,
}: {
  activeSlug: string;
  activeHref?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  function handleNavigation(event: ReactMouseEvent<HTMLElement>) {
    const anchor =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (!anchor) return;

    onNavigate?.();

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (anchor.target && anchor.target !== "_self")
    ) {
      return;
    }

    const url = new URL(anchor.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      !url.pathname.startsWith("/design-system")
    ) {
      return;
    }

    event.preventDefault();
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <aside
      onClickCapture={handleNavigation}
      className="flex h-full w-full max-w-full flex-col overflow-auto bg-primary pt-5"
    >
      <div className="px-5">
        <LabMark />
      </div>

      <NavList
        activeUrl={activeHref ?? `/design-system/${activeSlug}`}
        items={navItems(activeSlug)}
      />

      <div className="mt-auto border-t border-secondary px-5 py-4">
        <p className="text-xs text-tertiary">
          Vendored from{" "}
          <a
            href="https://github.com/untitleduico/react"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-secondary underline underline-offset-2 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            untitleduico/react
          </a>{" "}
          at <code className="font-mono">c981a73</code> and{" "}
          <a
            href="https://github.com/keenthemes/reui"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-secondary underline underline-offset-2 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            ReUI
          </a>{" "}
          at <code className="font-mono">8a2c701</code>. Development only.
        </p>
      </div>
    </aside>
  );
}

export function LabShell({
  activeSlug,
  activeHref,
  title,
  summary,
  source,
  docs,
  children,
  wide = false,
}: {
  activeSlug: string;
  activeHref?: string;
  title: string;
  summary: string;
  source: keyof typeof sourceLabels;
  docs?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-primary lg:flex-row">
      {/* Mobile header */}
      <AriaDialogTrigger>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-secondary bg-primary p-3 pl-4 lg:hidden">
          <LabMark />
          <AriaButton
            aria-label="Expand navigation menu"
            className="group flex items-center justify-center rounded-lg bg-primary p-2 text-fg-secondary outline-focus-ring hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Menu02 className="size-6 transition duration-200 ease-in-out group-aria-expanded:opacity-0" />
            <CloseIcon className="absolute size-6 opacity-0 transition duration-200 ease-in-out group-aria-expanded:opacity-100" />
          </AriaButton>
        </header>

        <AriaModalOverlay
          isDismissable
          className={({ isEntering, isExiting }) =>
            cx(
              "fixed inset-0 z-50 cursor-pointer bg-overlay/70 pr-16 backdrop-blur-md lg:hidden",
              isEntering && "duration-300 ease-in-out animate-in fade-in",
              isExiting && "duration-200 ease-in-out animate-out fade-out",
            )
          }
        >
          {({ state }) => (
            <>
              <AriaButton
                aria-label="Close navigation menu"
                onPress={() => state.close()}
                className="fixed top-2.5 right-3 flex cursor-pointer items-center justify-center rounded-lg p-2 text-fg-white/70 outline-focus-ring hover:bg-white/10 hover:text-fg-white focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <CloseIcon className="size-6" />
              </AriaButton>

              <AriaModal className="w-full max-w-74 cursor-auto will-change-transform">
                <AriaDialog className="h-dvh outline-hidden focus:outline-hidden">
                  <SidebarBody
                    activeSlug={activeSlug}
                    activeHref={activeHref}
                    onNavigate={() => state.close()}
                  />
                </AriaDialog>
              </AriaModal>
            </>
          )}
        </AriaModalOverlay>
      </AriaDialogTrigger>

      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh w-70 shrink-0 border-r border-secondary lg:block">
        <SidebarBody activeSlug={activeSlug} activeHref={activeHref} />
      </div>

      <main className="min-w-0 flex-1 bg-secondary_alt">
        <div
          className={cx(
            "mx-auto flex flex-col gap-8 px-4 py-8 md:px-8 md:py-12",
            wide ? "max-w-[1680px]" : "max-w-6xl",
          )}
        >
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                  {title}
                </h1>
                <p className="text-md text-tertiary">{summary}</p>
              </div>
              <ThemeSwitch />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                size="md"
                type="pill-color"
                color={
                  source === "review"
                    ? "brand"
                    : source === "adapted"
                      ? "warning"
                      : source === "reui"
                        ? "brand"
                        : source === "mit"
                          ? "success"
                          : "gray"
                }
              >
                {sourceLabels[source]}
              </Badge>
              {docs && (
                <a
                  href={docs}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm text-sm font-semibold text-brand-secondary underline underline-offset-3 outline-focus-ring hover:text-brand-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Official documentation
                </a>
              )}
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
