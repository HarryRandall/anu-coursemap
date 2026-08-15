"use client";

import Link from "next/link";
import { ArrowUpRight, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { TermChooser } from "@/components/overlays";
import type { Course } from "@/lib/catalogue";

const actionButtonClasses =
  "grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:bg-zinc-100 focus-visible:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export function CourseRowActions({ course }: { course: Course }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const menuId = useId();

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
    <div ref={root} className="relative">
      <div
        className={cn(
          "flex items-center justify-end gap-0.5 transition-opacity duration-150 motion-reduce:opacity-100 motion-reduce:transition-none",
          menuOpen
            ? "opacity-100"
            : "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100",
        )}
      >
        <Link
          href={`/courses/${course.code}`}
          aria-label={`View ${course.code}`}
          title="View course"
          className={actionButtonClasses}
        >
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <button
          type="button"
          aria-label={`Add ${course.code} to plan`}
          title="Add to plan"
          className={actionButtonClasses}
          onClick={() => setPlanOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          id={buttonId}
          aria-label={`More actions for ${course.code}`}
          title="More"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuOpen ? menuId : undefined}
          className={actionButtonClasses}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </div>
      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute top-9 right-0 z-30 min-w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-md"
        >
          <Link
            role="menuitem"
            href={`/courses/${course.code}`}
            className="flex min-h-9 items-center px-3 text-[13px] text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
            onClick={() => setMenuOpen(false)}
          >
            View course
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-9 w-full items-center px-3 text-left text-[13px] text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
            onClick={() => {
              setMenuOpen(false);
              setPlanOpen(true);
            }}
          >
            Add to plan
          </button>
          <a
            role="menuitem"
            href={course.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-9 items-center px-3 text-[13px] text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
            onClick={() => setMenuOpen(false)}
          >
            Open ANU source
          </a>
        </div>
      ) : null}
      {planOpen ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </div>
  );
}
