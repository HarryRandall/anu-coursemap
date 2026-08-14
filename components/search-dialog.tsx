"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { courses } from "@/lib/catalogue";
import { Modal } from "@/components/ui/overlay";
import { CourseToken } from "@/components/ui/course-token";

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    const matches = courses.filter((course) =>
      `${course.code} ${course.name} ${course.subject} ${course.convener}`
        .toLowerCase()
        .includes(text),
    );
    return matches.slice(0, 8);
  }, [query]);

  const go = (code: string) => {
    onClose();
    router.push(`/courses/${code}`);
  };

  return (
    <Modal onClose={onClose} align="top" className="w-full max-w-xl" labelledBy="search-dialog-title">
      <h2 id="search-dialog-title" className="sr-only">
        Search courses
      </h2>
      <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4">
        <Search size={16} className="shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          placeholder="Search courses…"
          aria-label="Search courses"
          className="h-12 w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(results.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(0, index - 1));
            } else if (event.key === "Enter" && results[active]) {
              go(results[active].code);
            }
          }}
        />
      </div>

      <div className="max-h-[min(56vh,24rem)] overflow-y-auto p-1.5">
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
            <Search size={20} className="text-zinc-300" />
            <p className="mt-2 text-sm font-medium text-zinc-700">No courses found</p>
            <p className="text-xs text-zinc-400">Try a different code or keyword.</p>
          </div>
        ) : (
          <ul role="listbox" aria-label="Course results">
            {results.map((course, index) => (
              <li key={course.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(course.code)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                    index === active ? "bg-zinc-100" : "hover:bg-zinc-50",
                  )}
                >
                  <CourseToken code={course.code} accent={course.accent} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="truncate text-[13px] font-medium text-zinc-900">
                      {course.name}
                    </span>
                    <span className="ml-2 truncate text-[11px] text-zinc-400">
                      {course.code} · {course.units} units
                    </span>
                  </span>
                  {index === active ? (
                    <CornerDownLeft size={14} className="shrink-0 text-zinc-400" />
                  ) : (
                    <ArrowRight size={14} className="shrink-0 text-zinc-200" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-2 text-[10px] text-zinc-400">
        <span>
          <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-zinc-200">↑↓</kbd> navigate
        </span>
        <span>
          <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-zinc-200">↵</kbd> open
        </span>
        <span>
          <kbd className="rounded bg-white px-1 py-0.5 ring-1 ring-zinc-200">esc</kbd> close
        </span>
      </div>
    </Modal>
  );
}
