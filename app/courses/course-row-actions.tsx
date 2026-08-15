"use client";

import Link from "next/link";
import { BookOpen, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { TermChooser } from "@/components/overlays";
import { IconButton } from "@/components/ui/button";
import type { Course } from "@/lib/catalogue";

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
    <div
      ref={root}
      className="relative flex min-h-12 items-center justify-end pr-3"
    >
      <IconButton
        id={buttonId}
        label={`Actions for ${course.code}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </IconButton>
      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute top-11 right-3 z-30 min-w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-md"
        >
          <Link
            role="menuitem"
            href={`/courses/${course.code}`}
            className="flex min-h-11 items-center gap-2 px-3 text-[13px] text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
            onClick={() => setMenuOpen(false)}
          >
            <BookOpen size={15} aria-hidden="true" />
            View course
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[13px] text-zinc-700 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
            onClick={() => {
              setMenuOpen(false);
              setPlanOpen(true);
            }}
          >
            <Plus size={15} aria-hidden="true" />
            Add to plan
          </button>
        </div>
      ) : null}
      {planOpen ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </div>
  );
}
