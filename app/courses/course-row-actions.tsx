"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Eye, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { TermChooser } from "@/components/overlays";
import { IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";

export function CourseRowActions({
  course,
}: {
  course: Pick<CatalogueCourse, "code" | "name" | "sessions" | "sourceUrl">;
}) {
  const router = useRouter();
  const [planOpen, setPlanOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            label={`Actions for ${course.code}`}
            variant="ghost"
            size="icon-sm"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel>{course.code}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => router.push(`/courses/${course.code}`)}
          >
            <Eye aria-hidden="true" />
            View course
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPlanOpen(true)}>
            <Plus aria-hidden="true" />
            Add to plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              window.open(course.sourceUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink aria-hidden="true" />
            Open ANU source
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {planOpen ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </>
  );
}
