import { Ellipsis, Pencil, Eraser, Trash2 } from "lucide-react";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@coursemap/ui/primitives/dropdown-menu";
import { hasResult, type PreviewCourse } from "./preview-data";

export function PreviewCourseActions({
  course,
  onEdit,
  onAction,
}: {
  course: PreviewCourse;
  onEdit: () => void;
  onAction: (action: "clear" | "remove") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${course.code}`}
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" />
          {hasResult(course) ? "Edit result" : "Record result"}
        </DropdownMenuItem>
        {hasResult(course) ? (
          <DropdownMenuItem onSelect={() => onAction("clear")}>
            <Eraser aria-hidden="true" />
            Clear result
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onAction("remove")}
          className="text-destructive"
        >
          <Trash2 aria-hidden="true" />
          Remove course
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
