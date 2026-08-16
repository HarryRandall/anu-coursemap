"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Eye, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { TermChooser } from "@/components/overlays";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";

const menuItemClasses =
  "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-zinc-700 hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none";

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 font-sans text-[10px] font-medium text-zinc-500 uppercase">
      {children}
    </kbd>
  );
}

const MENU_HEIGHT = 136;

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

export function CourseRowActions({
  course,
}: {
  course: Pick<CatalogueCourse, "code" | "name" | "sessions" | "sourceUrl">;
}) {
  const router = useRouter();
  const { code } = course;
  const [menuOpen, setMenuOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [planOpen, setPlanOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const buttonId = useId();
  const menuId = useId();

  const openMenu = () => {
    setPlacement(placementFor(root.current));
    setMenuOpen(true);
  };

  const viewCourse = () => {
    setMenuOpen(false);
    router.push(`/courses/${code}`);
  };

  const addToPlan = () => {
    setMenuOpen(false);
    setPlanOpen(true);
  };

  const openSource = () => {
    setMenuOpen(false);
    window.open(course.sourceUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        setMenuOpen(false);
        trigger.current?.focus();
        return;
      }
      const shortcut = event.key.toLowerCase();
      if (shortcut === "v") viewCourse();
      if (shortcut === "a") addToPlan();
      if (shortcut === "o") openSource();
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
    // The handlers only read stable refs and the course looked up from the code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  return (
    <div
      ref={root}
      className="relative flex justify-end"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setMenuOpen(false);
        }
      }}
    >
      <button
        ref={trigger}
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
            "absolute right-0 z-30 min-w-52 animate-fade-in rounded-xl border border-zinc-200 bg-white p-1 shadow-lg motion-reduce:animate-none",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          <button
            type="button"
            role="menuitem"
            className={menuItemClasses}
            onClick={viewCourse}
          >
            <Eye size={15} aria-hidden="true" className="text-zinc-500" />
            View course
            <Keycap>V</Keycap>
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClasses}
            onClick={addToPlan}
          >
            <Plus size={15} aria-hidden="true" className="text-zinc-500" />
            Add to plan
            <Keycap>A</Keycap>
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClasses}
            onClick={openSource}
          >
            <ExternalLink
              size={15}
              aria-hidden="true"
              className="text-zinc-500"
            />
            Open ANU source
            <Keycap>O</Keycap>
          </button>
        </div>
      ) : null}
      {planOpen ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </div>
  );
}
