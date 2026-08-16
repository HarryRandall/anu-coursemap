"use client";

import { ArrowRight, X } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { terms } from "@/lib/catalogue";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";
import { Modal } from "@/components/ui/overlay";
import { IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TermChooser({
  course,
  onClose,
}: {
  course: Pick<CatalogueCourse, "code" | "name" | "sessions">;
  onClose: () => void;
}) {
  const { addCourse, notify } = useCoursemap();

  return (
    <Modal
      onClose={onClose}
      labelledBy="term-dialog-title"
      className="w-full max-w-md"
    >
      <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            {course.code}
          </p>
          <h2
            id="term-dialog-title"
            className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900"
          >
            Choose a semester
          </h2>
        </div>
        <IconButton label="Close semester chooser" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      <div className="max-h-[70vh] overflow-y-auto p-2">
        {terms.slice(0, 6).map((term) => {
          const available = course.sessions.includes(term.name);
          return (
            <button
              key={term.id}
              type="button"
              onClick={async () => {
                const result = await addCourse(course.code, term.id);
                notify(result.message, result.ok ? "success" : "warning");
                if (result.ok) onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-zinc-900">
                  {term.name} {term.year}
                </span>
                <span className="block text-xs text-zinc-500">
                  {term.dates}
                </span>
              </span>
              <Badge tone={available ? "success" : "neutral"}>
                {available ? "Offered" : "Not listed"}
              </Badge>
              <ArrowRight size={16} className="text-zinc-300" />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
