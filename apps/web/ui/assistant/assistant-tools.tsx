"use client";

import { toast } from "sonner";
import { Folder, Globe, Paperclip, Plus, Telescope } from "lucide-react";
import { Button } from "@coursemap/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";

export function AssistantTools() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Add attachments and tools"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        <DropdownMenuItem onSelect={() => toast.info("Coming soon")}>
          <Paperclip aria-hidden="true" />
          Add files or photos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Tools</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => toast.info("Coming soon")}>
          <Globe aria-hidden="true" />
          Web search
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Coming soon")}>
          <Telescope aria-hidden="true" />
          Research mode
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Connectors</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => toast.info("Coming soon")}>
          <Plus aria-hidden="true" />
          Add connector
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Coming soon")}>
          <Folder aria-hidden="true" />
          Manage connectors
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
