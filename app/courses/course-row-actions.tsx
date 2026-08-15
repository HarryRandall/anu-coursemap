"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { TermChooser } from "@/components/overlays";
import { courseByCode } from "@/lib/catalogue";

const menuItemClasses =
  "flex min-h-9 w-full items-center px-3 text-left text-[13px] text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none";

const MENU_HEIGHT = 128;

/** The table scrolls, so the menu has to flip inside that clipping edge. */
function placementFor(anchor: HTMLElement | null) {
  if (!anchor) return "bottom" as const;

  let limit = window.innerHeight;
  for (
    let node = anchor.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const overflow = getComputedStyle(node).overflowX;
    if (overflow === "auto" || overflow === "scroll") {
      limit = Math.min(limit, node.getBoundingClientRect().bottom);
      break;
    }
  }

  return anchor.getBoundingClientRect().bottom + MENU_HEIGHT > limit
    ? ("top" as const)
    : ("bottom" as const);
}

/** Only the code crosses the server boundary, so rows stay out of the payload. */
export function CourseRowActions({ code }: { code: string }) {
  const course = courseByCode(code);
  const [menuOpen, setMenuOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [planOpen, setPlanOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonId = useId();
  const menuId = useId();

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // A short delay keeps the menu open while the pointer travels to it.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setMenuOpen(false), 140);
  };

  const openMenu = () => {
    cancelClose();
    setPlacement(placementFor(root.current));
    setMenuOpen(true);
  };

  useEffect(() => cancelClose, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [menuOpen]);

  return (
    <div
      ref={root}
      className="relative flex justify-end"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setMenuOpen(false);
        }
      }}
    >
      <button
        type="button"
        id={buttonId}
        aria-label={`Actions for ${code}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
        className={cn(
          "grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 motion-reduce:transition-none",
          menuOpen && "bg-zinc-100 text-zinc-900",
        )}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className={cn(
            "absolute right-0 z-30 min-w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-md",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          <Link
            role="menuitem"
            href={`/courses/${code}`}
            className={menuItemClasses}
            onClick={() => setMenuOpen(false)}
          >
            View course
          </Link>
          <button
            type="button"
            role="menuitem"
            className={menuItemClasses}
            onClick={() => {
              setMenuOpen(false);
              setPlanOpen(true);
            }}
          >
            Add to plan
          </button>
          {course ? (
            <a
              role="menuitem"
              href={course.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={menuItemClasses}
              onClick={() => setMenuOpen(false)}
            >
              Open ANU source
            </a>
          ) : null}
        </div>
      ) : null}
      {planOpen && course ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </div>
  );
}
